#!/usr/bin/env zx

import fs from 'fs/promises'
import yaml from 'js-yaml'
import { $ } from 'zx'

// Path to the Chart.yaml file
const chartFile = 'chart/chart-index/Chart.yaml'
const chartsDir = 'chart/charts'

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
      console.log(`Checking updates for dependency: ${dependency.name}`)

      // Add the Helm repository (idempotent)
      await $`helm repo add ${dependency.name} ${dependency.repository}`
      await $`helm repo update`

      // Get the latest version of the dependency
      const latestVersion = await $`helm search repo ${dependency.name}/${dependency.name} -o json`.then(
        (output) => JSON.parse(output.stdout)[0]?.version,
      )

      if (!latestVersion) {
        console.error(`Failed to fetch versions for dependency ${dependency.name}`)
        continue
      }

      if (latestVersion === dependency.version) {
        console.log(`${dependency.name} is already up to date.`)
        continue
      }

      console.log(`Updating ${dependency.name} from version ${dependency.version} to ${latestVersion}`)

      // Fetch and unpack the new chart version
      const tempDir = `./tmp/charts/${dependency.name}`
      await $`mkdir -p ${tempDir}`
      await $`helm pull ${dependency.name}/${dependency.name} --version ${latestVersion} --destination ${tempDir}`
      await $`tar -xzvf ${tempDir}/${dependency.name}-${latestVersion}.tgz -C ${chartsDir}`

      // Update the version in Chart.yaml
      dependency.version = latestVersion
    }

    // Write the updated Chart.yaml file
    const updatedChart = yaml.dump(chart)
    await fs.writeFile(chartFile, updatedChart, 'utf8')
    console.log('Updated Chart.yaml written successfully.')
  } catch (error) {
    console.error('Error updating dependencies:', error)
    process.exit(1)
  }
}

await main()
