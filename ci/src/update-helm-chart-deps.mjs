#!/usr/bin/env zx

import { config } from 'dotenv'
import envalid, { bool, json, str } from 'envalid'
import fs from 'fs/promises'
import yaml from 'js-yaml'
import semver from 'semver'
import { $ } from 'zx'

function isVersionApplicable(currentVersion, version, allowedUpgradeType) {
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

async function loadYamlFile(fileName) {
  const yamlContent = await fs.readFile(fileName, 'utf8')
  return yaml.load(yamlContent)
}

async function writeYamlFile(fileName, data) {
  const yamlContent = yaml.dump(data, { lineWidth: 1000 })
  await fs.writeFile(fileName, yamlContent, 'utf8')
}

async function renderKyvernoCrdTemplates(chartDir) {
  console.log(`Rendering templates from ${chartDir}`)
  const crdPath = `${chartDir}/crds`
  const tempPath = await $`mktemp -d`
  await $`helm template --output-dir ${tempPath} ${chartDir}`
  console.log(`Adding templates in ${crdPath}`)
  await $`mv ${tempPath}/kyverno/charts/crds/templates ${crdPath}`
  await $`rm -R ${tempPath}`
  return true
}

async function copyKserveCrdTemplates(chartDir) {
  console.log(`Copying templates from ${chartDir}`)
  const crdPath = `${chartDir}/../kserve/crds`
  console.log(`Adding CRDs to ${crdPath}`)
  await $`mv ${chartDir}/templates ${crdPath}`
  await $`rm -R ${chartDir}`
  return false
}

const CHART_SKIP_PRECHECK = ['kserve-crds']
const CHART_POST_FUNCS = {
  kyverno: renderKyvernoCrdTemplates,
  'kserve-crds': copyKserveCrdTemplates,
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
  const appsFile = '../apps.yaml'

  // Specify allowed upgrade types: 'minor', 'patch', or leave undefined for all
  const allowedUpgradeType = env.CI_UPDATE_TYPE

  const ciPushtoBranch = !env.CI_GIT_LOCAL_BRANCH_ONLY
  const ciCreateFeatureBranch = true
  const ciCreateGithubPr = !env.CI_GIT_LOCAL_BRANCH_ONLY && env.CI_GH_CREATE_PR && ciCreateFeatureBranch
  const dependencyNameFilter = env.CI_HELM_CHART_NAME_FILTER || []
  const baseBranch = env.CI_GIT_BASELINE_BRANCH

  try {
    // Read the Chart.yaml file
    const chart = await loadYamlFile(chartFile)
    const dependencyErrors = {}
    const fixedChartVersions = {}

    if (!Array.isArray(chart.dependencies) || chart.dependencies.length === 0) {
      console.error('No dependencies found in Chart.yaml')
      process.exit(1)
    }

    const apps = await loadYamlFile(appsFile)
    const appsInfo = apps.appsInfo
    if (!appsInfo || Object.keys(appsInfo).length === 0) {
      console.error('No app information found in apps.yaml')
      process.exit(1)
    }
    // Mapping to look up / update apps info by chart
    const chartApps = Object.fromEntries(
      Object.entries(appsInfo).map(([appName, appInfo]) => [appInfo.chartName || appName, appInfo])
    )

    for (const dependency of chart.dependencies) {
      const currentDependencyVersion = dependency.version
      const dirName = dependency.alias || dependency.name
      if (dependencyNameFilter.length !== 0 && !dependencyNameFilter.includes(dependency.name)) {
        console.log(
          `Skipping updates for dependency: ${dependency.name} due to dependencyNameFilter: ${dependencyNameFilter} `,
        )
        continue
      }

      if (!CHART_SKIP_PRECHECK.includes(dependency.name)) {
        console.log(`Pre-check for dependency ${dependency.name}`)
        const dependencyFileName = `${chartsDir}/${dirName}/Chart.yaml`
        try {
          const dependencyChart = await loadYamlFile(dependencyFileName)
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
      } else {
        console.log(`Skipping pre-check for dependency ${dependency.name}`)
      }

      const isRegistry = dependency.repository.startsWith('oci:')
      console.log(`Checking updates for dependency: ${dependency.name}`)
      try {
        let allVersions
        if (isRegistry) {
          const registry = dependency.repository.replace('oci://', 'docker://')
          allVersions = await $`skopeo list-tags ${registry}`
            .then((output) => JSON.parse(output.stdout))
            .then((results) => results.Tags.filter((version) => semver.valid(version)))

        } else {
          // Add the Helm repository (idempotent)
          await $`helm repo add ${dependency.name} ${dependency.repository}`
          await $`helm repo update ${dependency.name}`

          // Get all available versions for the dependency
          allVersions = await $`helm search repo ${dependency.name}/${dependency.name} -l -o json`
            .then((output) => JSON.parse(output.stdout))
            .then((results) => results.map((entry) => entry.version).filter((version) => semver.valid(version)))
        }

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
        await writeYamlFile(chartFile, chart)
        // Fetch and unpack the new chart version
        const downloadDir = `./tmp/charts/${dependency.name}`
        const tempDir = `${downloadDir}/${dirName}`
        await fs.mkdir(downloadDir, { recursive: true })
        await fs.rm(tempDir, { force: true, recursive: true })
        const pullArg = isRegistry ? dependency.repository : `${dependency.name}/${dependency.name}`
        await $`helm pull ${pullArg} --version ${latestVersion} --destination ${downloadDir} --untar`

        const postFunc = CHART_POST_FUNCS[dependency.name]
        let moveFiles = true
        if (postFunc) {
          moveFiles = await func(tempDir)
        }
        if (moveFiles) {
          await fs.rm(`${chartsDir}/${dirName}`, { force: true, recursive: true })
          await $`mv ${tempDir} ${chartsDir}/${dirName}`
        }

        const appInfo = chartApps[dependency.alias || dependency.name]
        let appsVersionSet = false
        if (appInfo) {
          console.log(`Chart ${dependency.name} assigned to app – looking up new version`)
          try {
            const dependencyChart = await loadYamlFile(dependencyFileName)
            const updatedAppVersion = dependencyChart?.appVersion
            if (updatedAppVersion) {
              const previousAppVersion = appInfo.appVersion
              appInfo.appVersion = updatedAppVersion.replace(/^v/, '')
              try {
                await writeYamlFile(appsFile, apps)
                await $`git add ${appsFile}`
                appsVersionSet = true
              } catch (error) {
                console.error(`Error updating app version for ${dependency.name}:`, error)
              } finally {
                // Restore to avoid side-effect on following run
                appInfo.appVersion = previousAppVersion
              }
            } else {
              console.info(`Updated app version not found in chart ${dependency.name}`)
            }
          } catch (error) {
            console.error(`Error checking dependency app version ${dependency.name}:`, error)
          }
        } else {
          console.log(`No app found for ${dependency.name}`)
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
          const prBody = [`This PR updates the dependency **${dependency.name}** to version **${latestVersion}**.`]
          if (!appsVersionSet) {
            prBody.push('TODO: Update app version in apps.yaml.')
          }
          const args = [
            '--title',
            commitMessage,
            '--body',
            prBody.join('\n'),
            '--base',
            baseBranch,
            '--head',
            branchName,
            '--draft',
            '--label',
            'chart-deps',
          ]
          await $`gh pr create ${args}`
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
      await writeYamlFile(chartFile, chart)
    }
  } catch (error) {
    console.error('Error updating dependencies:', error)
    process.exit(1)
  }
}
await main()
