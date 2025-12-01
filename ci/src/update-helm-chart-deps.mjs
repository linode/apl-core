#!/usr/bin/env zx

import { config } from 'dotenv'
import envalid, { bool, json, str } from 'envalid'
import fs from 'fs/promises'
import yaml from 'js-yaml'
import semver from 'semver'
import { $ } from 'zx'

// Path to the Chart.yaml file
const CHART_FILE = '../chart/chart-index/Chart.yaml'
const CHARTS_DIR = '../charts'
const APPS_FILE = '../apps.yaml'

function isVersionApplicable(currentVersion, version, allowedUpgradeType) {
  if (semver.lte(version, currentVersion)) {
    return false // Ignore versions that are <= current version
  }
  if (allowedUpgradeType === 'prerelease') {
    return true
  }
  if (semver.prerelease(version)) {
    return false
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

async function renderOtelCrdTemplates(chartDir) {
  console.log(`Rendering templates from ${chartDir}`)
  const crdPath = `${chartDir}/crds`
  // helm using --output-dir only considers files in templates/
  // move the CRD templates there and drop them later
  const tempCrdPath = `${chartDir}/templates/crds`
  await $`mv ${chartDir}/conf/crds ${tempCrdPath}`
  const tempPath = await $`mktemp -d`
  await $`helm template --namespace otel --set fullnameOverride=otel-operator --output-dir ${tempPath} otel-operator ${chartDir}`
  console.log(`Adding templates in ${crdPath}`)
  await $`mv ${tempPath}/opentelemetry-operator/templates/crds ${crdPath}`
  await $`rm -R ${tempPath}`
  await $`rm -R ${tempCrdPath}`
  return true
}

async function renderArgoCdImageUpdaterCrd(chartDir) {
  console.log(`Rendering templates from ${chartDir}`)
  const crdPath = `${chartDir}/crds`
  await $`mkdir ${crdPath}`
  const tempPath = await $`mktemp -d`
  await $`helm template --output-dir ${tempPath} ${chartDir}`
  console.log(`Adding templates in ${crdPath}`)
  await $`mv ${tempPath}/argocd-image-updater/templates/crd-imageupdaters.yaml ${crdPath}`
  await $`rm ${chartDir}/templates/crd-imageupdaters.yaml`
  await $`rm -R ${tempPath}`
  return true
}

async function copyKserveCrdTemplates(chartDir) {
  console.log(`Copying templates from ${chartDir}`)
  const crdPath = `${CHARTS_DIR}/kserve/crds`
  console.log(`Adding CRDs to ${crdPath}`)
  await fs.rm(crdPath, { force: true, recursive: true })
  await $`mv ${chartDir}/templates ${crdPath}`
  return false
}

async function copyLinodeCfwTemplates(chartDir) {
  console.log(`Copying templates from ${chartDir}`)
  const crdPath = `${CHARTS_DIR}/linode-cfw/crds`
  console.log(`Adding CRDs to ${crdPath}`)
  await fs.rm(crdPath, { force: true, recursive: true })
  await $`mv ${chartDir}/templates ${crdPath}`
  return false
}

async function getAppVersion(chartDir, defaultName) {
  console.log(`Extracting app version for ${defaultName} from ${chartDir}`)
  const dependencyChart = await loadYamlFile(`${chartDir}/Chart.yaml`)
  const updatedAppVersion = dependencyChart?.appVersion || dependencyChart?.version
  return Object.fromEntries([[defaultName, updatedAppVersion]])
}

async function getKubePromStackApps(chartDir) {
  console.log(`Extracting app versions from ${chartDir}`)
  try {
    const chartValues = await loadYamlFile(`${chartDir}/values.yaml`)
    const alertManagerVersion = chartValues.alertmanager.alertmanagerSpec.image.tag
    const prometheusVersion = chartValues.prometheus.prometheusSpec.image.tag
    const grafanaChart = await loadYamlFile(`${chartDir}/charts/grafana/Chart.yaml`)
    const grafanaVersion = grafanaChart.appVersion
    return {
      alertmanager: alertManagerVersion,
      prometheus: prometheusVersion,
      grafana: grafanaVersion,
    }
  } catch (e) {
    console.error('Field to extract version information from chart:', e)
  }
}

// Charts that need to be processed together in one PR.
// The first one is considered the main dependency.
const CHART_GROUPS = {
  istio: ['base', 'istiod', 'gateway'],
  kserve: ['kserve', 'kserve-crd'],
  'cloud-firewall': ['cloud-firewall-controller', 'cloud-firewall-crd'],
}
// Skip version check for some charts, that are not stored on their own.
const CHART_SKIP_PRECHECK = ['cloud-firewall-crd', 'kserve-crd']
// Custom post-processing functions, modifying the charts
const CHART_POST_FUNCS = {
  kyverno: renderKyvernoCrdTemplates,
  'opentelemetry-operator': renderOtelCrdTemplates,
  'argocd-image-updater': renderArgoCdImageUpdaterCrd,
  'kserve-crd': copyKserveCrdTemplates,
  'cloud-firewall-crd': copyLinodeCfwTemplates,
}
// List charts that are not represented in apps.yaml
const SKIP_APP_VERSION = [
  'plugin-barman-cloud',
  'cloud-firewall-controller',
  'metrics-server',
  'oauth2-proxy',
  'policy-reporter',
  'prometheus-blackbox-exporter',
  'prometheus-msteams',
]
// Add custom functions for charts that represent multiple
// entries in apps.yaml
const CHART_VERSION_FUNCS = {
  'kube-prometheus-stack': getKubePromStackApps,
}

async function checkDependencyUpdates(dependency, allowedUpgradeType) {
  const isRegistry = dependency.repository.startsWith('oci:')
  console.log(`Checking updates for dependency: ${dependency.name}`)
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
    throw 'No valid versions found.'
  }

  // Filter versions for allowed upgrades (minor/patch)
  const currentVersion = dependency.version
  const filteredVersions = allVersions.filter((version) => {
    return isVersionApplicable(currentVersion, version, allowedUpgradeType)
  })

  if (!filteredVersions.length) {
    console.log(`No matching ${allowedUpgradeType} updates for dependency ${dependency.name}`)
    return undefined
  }

  // Determine the latest matching version
  const latestVersion = filteredVersions.sort(semver.rcompare)[0]

  if (latestVersion === currentVersion) {
    console.log(`${dependency.name} is already up to date.`)
    return undefined
  }
  return latestVersion
}

async function checkBranch(dependencyName, latestVersion, checkRemote) {
  const branchName = `ci-update-${dependencyName}-to-${latestVersion}`
  const checkBranchCmd = checkRemote
    ? $`git ls-remote --heads origin ${branchName}`
    : $`git branch --list ${branchName}`
  const existingBranch = await checkBranchCmd
  if (existingBranch.stdout !== '') {
    console.log(`Skipping updates for dependency: ${dependencyName}: the feature branch ${branchName} already exists`)
    return undefined
  }
  return branchName
}

async function downloadDependency(dependency, dirName, latestVersion) {
  console.log(`Updating ${dependency.name} from version ${dependency.version} to ${latestVersion}`)

  // Fetch and unpack the new chart version
  const downloadDir = `./tmp/charts/${dependency.name}`
  const tempDir = `${downloadDir}/${dependency.name}`
  await fs.mkdir(downloadDir, { recursive: true })
  await fs.rm(tempDir, { force: true, recursive: true })
  const isRegistry = dependency.repository.startsWith('oci:')
  const pullArg = isRegistry ? dependency.repository : `${dependency.name}/${dependency.name}`
  await $`helm pull ${pullArg} --version ${latestVersion} --destination ${downloadDir} --untar`

  const postFunc = CHART_POST_FUNCS[dependency.name]
  let moveFiles = true
  // If a post-processing function is defined, and handles moving of files into the final structure,
  // it can return false.
  if (postFunc) {
    moveFiles = await postFunc(tempDir)
  }
  if (moveFiles) {
    await fs.rm(`${CHARTS_DIR}/${dirName}`, { force: true, recursive: true })
    await $`mv ${tempDir} ${CHARTS_DIR}/${dirName}`
  }
}

async function updateDependency(
  groupName,
  dependencies,
  chart,
  chartApps,
  apps,
  allowedUpgradeType,
  ciCreateFeatureBranch,
  ciPushtoBranch,
  ciCreateGithubPr,
  baseBranch,
) {
  const mainDependency = dependencies[0]
  const mainName = mainDependency.name
  const extraDependencies = dependencies.slice(1)
  const preservedVersions = Object.fromEntries(dependencies.map((dependency) => [dependency.name, dependency.version]))
  const dirName = mainDependency.alias || mainName

  try {
    const latestVersion = await checkDependencyUpdates(mainDependency, allowedUpgradeType)
    if (!latestVersion) {
      return false
    }
    const branchName = await checkBranch(groupName, latestVersion, ciPushtoBranch)
    if (!branchName) {
      return false
    }
    await downloadDependency(mainDependency, dirName, latestVersion)
    // Update the version in Chart.yaml
    mainDependency.version = latestVersion
    for (const extraDependency of extraDependencies) {
      const extraVersion = await checkDependencyUpdates(extraDependency, allowedUpgradeType)
      if (extraVersion) {
        await downloadDependency(extraDependency, extraDependency.alias || extraDependency.name, extraVersion)
        // Update the version in Chart.yaml
        extraDependency.version = extraVersion
      }
    }
    const commitMessage = `chore(chart-deps): update ${groupName} to version ${latestVersion}`
    if (ciCreateFeatureBranch) {
      await $`git -c core.hooksPath=/dev/null checkout -b ${branchName}`
    }
    // Write the updated Chart.yaml file
    await writeYamlFile(CHART_FILE, chart)

    let appsVersionPending = !SKIP_APP_VERSION.includes(groupName)
    if (appsVersionPending) {
      try {
        const appVersionFunc = CHART_VERSION_FUNCS[groupName] || (chartApps.hasOwnProperty(groupName) ? getAppVersion : undefined)
        if (appVersionFunc) {
          const updatedVersions = await appVersionFunc(`${CHARTS_DIR}/${dirName}`, groupName)
          if (updatedVersions) {
            const previousAppVersions = {}
            try {
              Object.entries(updatedVersions).forEach(([key, value]) => {
                previousAppVersions[key] = chartApps[key].appVersion
                chartApps[key].appVersion = value.replace(/^v/, '')
              })
              await writeYamlFile(APPS_FILE, apps)
              if (ciCreateFeatureBranch) {
                await $`git add ${APPS_FILE}`
              }
              appsVersionPending = false
            } catch (error) {
              console.error(`Error updating app version for ${groupName}:`, error)
            } finally {
              // Restore to avoid side-effect on following run
              Object.entries(previousAppVersions).forEach(([key, value]) => {
                chartApps[key].appVersion = value
              })
            }
          } else {
            console.info(`Updated app version not found in chart ${groupName}`)
          }
        } else {
          console.log(`No app found for ${groupName}`)
        }
      } catch (error) {
        console.error(`Error checking dependency app version ${groupName}:`, error)
      }
    }

    if (ciCreateFeatureBranch) {
      await $`git add ${CHART_FILE}`
      await $`git add ${CHARTS_DIR}`
      await $`git commit -m ${commitMessage}`
    }
    if (ciPushtoBranch) {
      // Push the branch
      await $`git push --no-verify origin ${branchName}`
    }
    if (ciCreateGithubPr) {
      // Create a pull request
      const prBody = [`This PR updates the dependency **${mainName}** to version **${latestVersion}**.`]
      if (appsVersionPending) {
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
    return true
  } finally {
    // restore versions so it does not populate to the next chart update
    for (const dependency of dependencies) {
      dependency.version = preservedVersions[dependency.name]
    }
    if (ciCreateFeatureBranch) {
      // Reset to the main branch for the next dependency
      await $`git -c core.hooksPath=/dev/null checkout ${baseBranch}`
      await $`git reset --hard ${ciPushtoBranch ? 'origin/' : ''}${baseBranch}`
    }
  }
}

function groupDependencies(dependencies, allDependencies) {
  // Dependencies in CHART_GROUPS will be handled together.
  // Any other are assigned in a self-named group with one item.

  // First map grouped dependencies per name to its group
  const depsInGroups = {}
  Object.entries(CHART_GROUPS).forEach(([groupName, groupDepNames]) => {
    for (const depName of groupDepNames) {
      depsInGroups[depName] = groupName
    }
  })

  const groupedDeps = {}
  for (const dependency of dependencies) {
    const groupName = depsInGroups[dependency.name]
    if (groupName) {
      if (!groupedDeps.hasOwnProperty(groupName)) {
        groupedDeps[groupName] = CHART_GROUPS[groupName].map((depName) => allDependencies[depName])
      }
    } else {
      groupedDeps[dependency.alias || dependency.name] = [dependency]
    }
  }
  return groupedDeps
}

async function main() {
  config()
  const env = envalid.cleanEnv(process.env, {
    CI_UPDATE_TYPE: str({
      desc: 'Path to the YAML file to validate',
      choices: ['patch', 'minor', 'major', 'prerelease', 'init'],
      default: 'minor',
    }),
    CI_HELM_CHART_NAME_FILTER: json({ desc: 'A list of names in json format', default: [] }),
    CI_GH_CREATE_PR: bool({ desc: 'Create Github PR', default: true }),
    CI_GIT_BASELINE_BRANCH: str({ desc: 'A baseline git branch', default: 'main' }),
    CI_GIT_LOCAL_BRANCH_ONLY: bool({ desc: 'Perform changes only on local branches', default: false }),
  })

  // Specify allowed upgrade types: 'minor', 'patch', or leave undefined for all
  const allowedUpgradeType = env.CI_UPDATE_TYPE

  const ciPushtoBranch = !env.CI_GIT_LOCAL_BRANCH_ONLY
  const ciCreateFeatureBranch = true
  const ciCreateGithubPr = !env.CI_GIT_LOCAL_BRANCH_ONLY && env.CI_GH_CREATE_PR && ciCreateFeatureBranch
  const dependencyNameFilter = env.CI_HELM_CHART_NAME_FILTER || []
  const baseBranch = env.CI_GIT_BASELINE_BRANCH

  try {
    // Read the Chart.yaml file
    const chart = await loadYamlFile(CHART_FILE)
    const dependencyErrors = {}
    const fixedChartVersions = {}

    if (!Array.isArray(chart.dependencies) || chart.dependencies.length === 0) {
      console.error('No dependencies found in Chart.yaml')
      process.exit(1)
    }

    const apps = await loadYamlFile(APPS_FILE)
    const appsInfo = apps.appsInfo
    if (!appsInfo || Object.keys(appsInfo).length === 0) {
      console.error('No app information found in apps.yaml')
      process.exit(1)
    }
    // Mapping to look up / update apps info by chart
    const chartApps = Object.fromEntries(
      Object.entries(appsInfo).map(([appName, appInfo]) => [appInfo.chartName || appName, appInfo]),
    )

    const allDependencies = Object.fromEntries(chart.dependencies.map((dependency) => [dependency.name, dependency]))
    const filteredDependencies = []

    for (const dependency of chart.dependencies) {
      if (dependencyNameFilter.length !== 0 && !dependencyNameFilter.includes(dependency.name)) {
        console.log(
          `Skipping updates for dependency: ${dependency.name} due to dependencyNameFilter: ${dependencyNameFilter} `,
        )
        continue
      }

      if (!CHART_SKIP_PRECHECK.includes(dependency.name) && allowedUpgradeType !== 'init') {
        const dirName = dependency.alias || dependency.name
        const dependencyFileName = `${CHARTS_DIR}/${dirName}/Chart.yaml`
        console.log(`Pre-check for dependency ${dependency.name}`)
        try {
          const dependencyChart = await loadYamlFile(dependencyFileName)
          if (dependencyChart.version.replace(/^v/, '') !== dependency.version.replace(/^v/, '')) {
            console.error(
              `Skipping update, indexed version of dependency ${dependency.name} is not consistent with chart version.`,
            )
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

      filteredDependencies.push(dependency)
    }

    const dependencyGroups = groupDependencies(filteredDependencies, allDependencies)

    for (const [groupName, dependencies] of Object.entries(dependencyGroups)) {
      try {
        await updateDependency(
          groupName,
          dependencies,
          chart,
          chartApps,
          apps,
          allowedUpgradeType,
          ciCreateFeatureBranch,
          ciPushtoBranch,
          ciCreateGithubPr,
          baseBranch,
        )
      } catch (error) {
        console.error(`Error updating ${groupName}:`, error)
        dependencyErrors[groupName] = error
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
      await writeYamlFile(CHART_FILE, chart)
    }
  } catch (error) {
    console.error('Error updating dependencies:', error)
    process.exit(1)
  }
}
await main()
