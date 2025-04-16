#!/usr/bin/env zx

import { config } from 'dotenv'
import envalid, { bool, json, str } from 'envalid'
import fs from 'fs/promises'
import yaml from 'js-yaml'
import semver from 'semver'
import { $ } from 'zx'

export function isVersionApplicable(currentVersion, version, allowedUpgradeType) {
  if (semver.lte(version, currentVersion)) {
    return false // Ignore versions that are <= current version
  }
  if (allowedUpgradeType === 'patch') {
    return semver.diff(currentVersion, version) === 'patch'
  }
  if (allowedUpgradeType === 'minor') {
    const isMinorOrPatch =
      semver.diff(currentVersion, version) === 'patch' || semver.diff(currentVersion, version) === 'minor'
    return isMinorOrPatch
  }
  return true // Default: Allow all upgrades
}

async function main() {
  config()
  const env = envalid.cleanEnv(process.env, {
    CI_UPDATE_TYPE: str({
      desc: 'Path to the YAML file to validate',
      choices: ['patch', 'minor', 'major'],
      default: 'minor',
    }),
    CI_HELM_CHART_NAME_FILTER: json({ desc: 'A list of names in json format', default: [] }),
    CI_GH_CREATE_PR: bool({ desc: 'Create Github PR', default: true }),
    CI_GIT_BASELINE_BRANCH: str({ desc: 'A baseline git branch', default: 'main' }),
    CI_GIT_LOCAL_BRANCH_ONLY: bool({ desc: 'Perform changes only on local branches', default: false }),
  })

  // Path to the Chart.yaml file
  const chartFile = '../chart/chart-index/Chart.yaml'
  const chartsDir = '../charts'

  // Specify allowed upgrade types: 'minor', 'patch', or leave undefined for all
  const allowedUpgradeType = env.CI_UPDATE_TYPE

  const ciPushtoBranch = !env.CI_GIT_LOCAL_BRANCH_ONLY
  const ciCreateFeatureBranch = true
  const ciCreateGithubPr = !env.CI_GIT_LOCAL_BRANCH_ONLY && env.CI_GH_CREATE_PR && ciCreateFeatureBranch
  const dependencyNameFilter = env.CI_HELM_CHART_NAME_FILTER || []
  const baseBranch = env.CI_GIT_BASELINE_BRANCH

  try {
    // Read the Chart.yaml file
    const chartContent = await fs.readFile(chartFile, 'utf8')
    const chart = yaml.load(chartContent)
    const dependencyErrors = {}
    const fixedChartVersions = {}

    if (!chart.dependencies || !Array.isArray(chart.dependencies)) {
      console.error('No dependencies found in Chart.yaml')
      process.exit(1)
    }

    for (const dependency of chart.dependencies) {
      const currentDependencyVersion = dependency.version
      if (dependencyNameFilter.length != 0 && !dependencyNameFilter.includes(dependency.name)) {
        console.log(
          `Skipping updates for dependency: ${dependency.name} due to dependencyNameFilter: ${dependencyNameFilter} `,
        )
        continue
      }

      console.log(`Pre-check for dependency ${dependency.name}`)
      try {
        const dependencyFileName = `${chartsDir}/${dependency.alias || dependency.name}/Chart.yaml`
        const dependencyFile = await fs.readFile(dependencyFileName, 'utf8')
        const dependencyChart = yaml.load(dependencyFile)
        if (dependencyChart.version !== currentDependencyVersion) {
          console.error(`Skipping update, indexed version of dependency ${dependency.name} is not consistent with chart version.`)
          dependencyErrors[dependency.name] = 'Indexed version of dependency is not consistent with chart version.'
          fixedChartVersions[dependency.name] = dependencyChart.version
          continue
        }
      } catch (error) {
        console.error(`Error checking dependency ${dependency.name}:`, error)
        dependencyErrors[dependency.name] = error
        continue
      }

      console.log(`Checking updates for dependency: ${dependency.name}`)
      try {
        // Add the Helm repository (idempotent)
        await $`helm repo add ${dependency.name} ${dependency.repository}`
        await $`helm repo update ${dependency.name}`

        // Get all available versions for the dependency
        const allVersions = await $`helm search repo ${dependency.name}/${dependency.name} -l -o json`
          .then((output) => JSON.parse(output.stdout))
          .then((results) => results.map((entry) => entry.version).filter((version) => semver.valid(version)))

        if (!allVersions.length) {
          console.error(`No valid versions found for dependency ${dependency.name}`)
          dependencyErrors[dependency.name] = 'No valid versions found.'
          continue
        }

        // Filter versions for allowed upgrades (minor/patch)
        const currentVersion = dependency.version
        const filteredVersions = allVersions.filter((version) => {
          return isVersionApplicable(currentVersion, version, allowedUpgradeType)
        })

        if (!filteredVersions.length) {
          console.log(`No matching ${allowedUpgradeType} updates for dependency ${dependency.name}`)
          continue
        }

        // Determine the latest matching version
        const latestVersion = filteredVersions.sort(semver.rcompare)[0]

        if (latestVersion === currentVersion) {
          console.log(`${dependency.name} is already up to date.`)
          continue
        }
        const branchName = `ci-update-${dependency.name}-to-${latestVersion}`
        const checkBranchCmd = ciPushtoBranch ? $`git ls-remote --heads origin ${branchName}` : $`git branch --list ${branchName}`
        const existingBranch = await checkBranchCmd
        if (existingBranch.stdout !== '') {
          console.log(
            `Skipping updates for dependency: ${dependency.name}: the feature branch ${branchName} already exists`,
          )
          continue
        }

        console.log(`Updating ${dependency.name} from version ${currentVersion} to ${latestVersion}`)

        // Update the version in Chart.yaml
        dependency.version = latestVersion

        const commitMessage = `chore(chart-deps): update ${dependency.name} to version ${latestVersion}`
        if (ciCreateFeatureBranch) {
          await $`git -c core.hooksPath=/dev/null checkout -b ${branchName}`
        }

        // Write the updated Chart.yaml file
        const updatedChart = yaml.dump(chart)
        await fs.writeFile(chartFile, updatedChart, 'utf8')
        // Fetch and unpack the new chart version
        const tempDir = `./tmp/charts/${dependency.name}`
        await $`mkdir -p ${tempDir}`
        await $`helm pull ${dependency.name}/${dependency.name} --version ${latestVersion} --destination ${tempDir}`

        if (dependency.alias) {
          await $`rm -R ${chartsDir}/${dependency.alias}`
          await $`tar -xzvf ${tempDir}/${dependency.name}-${latestVersion}.tgz -C ${tempDir}`
          await $`mv ${tempDir}/${dependency.name} ${chartsDir}/${dependency.alias}`
        } else {
          await $`rm -R ${chartsDir}/${dependency.name}`
          await $`tar -xzvf ${tempDir}/${dependency.name}-${latestVersion}.tgz -C ${chartsDir}`
        }

        if (ciCreateFeatureBranch) {
          await $`git add ${chartFile}`
          await $`git add ${chartsDir}`
          await $`git commit -m ${commitMessage}`
        }
        if (ciPushtoBranch) {
          // Push the branch
          await $`git push --no-verify origin ${branchName}`
        }
        if (ciCreateGithubPr) {
          // Create a pull request
          const prBody = `This PR updates the dependency **${dependency.name}** to version **${latestVersion}**.`
          await $`gh pr create --title ${commitMessage} --body "${prBody}" --base ${baseBranch} --head ${branchName}`
        }
      } catch (error) {
        console.error('Error updating dependencies:', error)
        dependencyErrors[dependency.name] = error
      } finally {
        // restore this version so it does not populate to the next chart update
        dependency.version = currentDependencyVersion
        if (ciCreateFeatureBranch) {
          // Reset to the main branch for the next dependency
          await $`git -c core.hooksPath=/dev/null checkout ${baseBranch}`
          await $`git reset --hard ${ciPushtoBranch ? 'origin/' : ''}${baseBranch}`
        }
      }
    }

    console.log('Dependency updates complete.')
    if (Object.keys(dependencyErrors).length > 0) {
      console.log('Summary of errors encountered during the update:')
      Object.entries(dependencyErrors).forEach(([key, value]) => {
        console.log(`${key}:`, value)
      })
    }
    if (Object.keys(fixedChartVersions).length > 0 && !ciPushtoBranch) {
      console.log('Writing mismatching versions to chart index.')
      for (const dependency of chart.dependencies) {
        const fixedVersion = fixedChartVersions[dependency.name]
        if (fixedVersion) {
          dependency.version = fixedVersion
        }
      }
      // Write the updated Chart.yaml file
      const updatedChart = yaml.dump(chart)
      await fs.writeFile(chartFile, updatedChart, 'utf8')
    }
  } catch (error) {
    console.error('Error updating dependencies:', error)
    process.exit(1)
  }
}
await main()
