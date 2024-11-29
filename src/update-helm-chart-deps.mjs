#!/usr/bin/env zx

import fs from 'fs/promises'
import yaml from 'js-yaml'
import semver from 'semver'
import { $ } from 'zx'

// Path to the Chart.yaml file
const chartFile = 'chart/chart-index/Chart.yaml'
const chartsDir = 'charts'

// Specify allowed upgrade types: 'minor', 'patch', or leave undefined for all
const allowedUpgradeType = process.env.ALLOWED_UPGRADE_TYPE || 'minor'

const ciPushtoBranch = true
const ciCreateFeatureBranch = true
const ciCreateGithubPr = true
const dependencyNameFilter = ['ingress-nginx']
const baseBranch = 'main'
// const dependencyNameFilter = []

async function main() {
  try {
    // Read the Chart.yaml file
    const chartContent = await fs.readFile(chartFile, 'utf8')
    const chart = yaml.load(chartContent)

    if (!chart.dependencies || !Array.isArray(chart.dependencies)) {
      console.error('No dependencies found in Chart.yaml')
      process.exit(1)
    }

    for (const dependency of chart.dependencies) {
      if (dependencyNameFilter.length != 0 && !dependencyNameFilter.includes(dependency.name)) {
        console.log(
          `Skipping  updates for dependency: ${dependency.name} due to dependencyNameFilter: ${dependencyNameFilter} `,
        )
        continue
      }

      console.log(`Checking updates for dependency: ${dependency.name}`)

      // Add the Helm repository (idempotent)
      await $`helm repo add ${dependency.name} ${dependency.repository}`
      await $`helm repo update`

      // Get all available versions for the dependency
      const allVersions = await $`helm search repo ${dependency.name}/${dependency.name} -o json`
        .then((output) => JSON.parse(output.stdout))
        .then((results) => results.map((entry) => entry.version).filter((version) => semver.valid(version)))

      if (!allVersions.length) {
        console.error(`No valid versions found for dependency ${dependency.name}`)
        continue
      }

      // Filter versions for allowed upgrades (minor/patch)
      const currentVersion = dependency.version
      const filteredVersions = allVersions.filter((version) => {
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

      console.log(`Updating ${dependency.name} from version ${currentVersion} to ${latestVersion}`)

      // Update the version in Chart.yaml
      dependency.version = latestVersion
      const branchName = `update-${dependency.name}-to-${latestVersion}`
      const commitMessage = `chore(chart-deps): update ${dependency.name} to version ${latestVersion}`
      if (ciCreateFeatureBranch) {
        // Create a new branch for the update
        await $`git checkout -b ${branchName}`
      }

      // Write the updated Chart.yaml file
      const updatedChart = yaml.dump(chart)
      await fs.writeFile(chartFile, updatedChart, 'utf8')
      // Fetch and unpack the new chart version
      const tempDir = `./tmp/charts/${dependency.name}`
      await $`mkdir -p ${tempDir}`
      await $`helm pull ${dependency.name}/${dependency.name} --version ${latestVersion} --destination ${tempDir}`
      await $`tar -xzvf ${tempDir}/${dependency.name}-${latestVersion}.tgz -C ${chartsDir}`

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

      if (ciCreateFeatureBranch) {
        // Reset to the main branch for the next dependency
        await $`git checkout ${baseBranch}`
        await $`git reset --hard origin/${baseBranch}`
      }
    }

    console.log('Dependency updates complete.')
  } catch (error) {
    console.error('Error updating dependencies:', error)
    process.exit(1)
  }
}

await main()
