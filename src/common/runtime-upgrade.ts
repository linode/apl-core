import semver from 'semver'
import { getApplications } from 'src/cmd/apply-as-apps'
import { terminal } from './debug'
import { deployEssential } from './hf'
import { getDeploymentState, k8s, waitForArgoCDAppHealthy, waitForArgoCDAppSync } from './k8s'
import { RuntimeUpgradeContext, RuntimeUpgrades, runtimeUpgrades } from './runtime-upgrades/runtime-upgrades'

interface RuntimeUpgradeArgs {
  when: string
}

export async function runtimeUpgrade({ when }: RuntimeUpgradeArgs): Promise<void> {
  const d = terminal('cmd:upgrade:runtimeUpgrade')
  const deploymentState = await getDeploymentState()

  if (!deploymentState?.version || !deploymentState?.deployingVersion) {
    d.info('Skipping the runtime upgrade procedure because this is initial installation')
    return
  }
  const deployedVersion: string = deploymentState.version
  d.info(`The current version of the App Platform: ${deployedVersion}`)
  d.info(`The deploying version of the App Platform: ${deploymentState.deployingVersion}`)

  if (semver.lte(deploymentState?.deployingVersion, deploymentState?.version)) {
    d.info('Skipping the runtime upgrade procedure as deploying version is not greater than the current version')
    return
  }

  d.info('Deploying essential manifests')
  const essentialDeployResult = await deployEssential(['upgrade=true'], true)
  if (!essentialDeployResult) {
    throw new Error('Failed to update namespaces')
  }

  const apps = await getApplications()
  const filteredUpgrades = filterRuntimeUpgrades(deployedVersion, runtimeUpgrades)

  if (filteredUpgrades.length === 0) {
    d.info('No runtime upgrade operations detected, skipping')
    return
  }

  const context: RuntimeUpgradeContext = {
    debug: d,
  }

  for (let i = 0; i < filteredUpgrades.length; i++) {
    const upgrade = filteredUpgrades[i]

    // Global upgrade operations (before everything or after everything)
    const operation = upgrade[when as keyof typeof upgrade] as (context: RuntimeUpgradeContext) => Promise<void>
    if (operation && typeof operation === 'function') {
      d.info(`Runtime upgrade operations detected for version ${upgrade.version}`)
      await operation(context)
    }

    // Application-specific upgrade operations - wait for all applications in this upgrade
    if (upgrade.applications) {
      await Promise.allSettled(
        Object.entries(upgrade.applications).map(async ([applicationName, applicationUpgrade]) => {
          const applicationOperation = applicationUpgrade[when as keyof typeof applicationUpgrade] as (
            context: RuntimeUpgradeContext,
          ) => Promise<void>
          if (
            apps.find((app) => app.includes(applicationName)) &&
            applicationOperation &&
            typeof applicationOperation === 'function'
          ) {
            d.info(
              `Runtime upgrade operations detected for version ${upgrade.version}, application: ${applicationName}`,
            )
            // Wait for the ArgoCD app to be synced and healthy before running the operation
            await waitForArgoCDAppSync(applicationName, k8s.custom(), d)
            await waitForArgoCDAppHealthy(applicationName, k8s.custom(), d)
            //execute the application-specific operation
            await applicationOperation(context)
          }
        }),
      )
    }
  }
}

export function filterRuntimeUpgrades(version: string, rUpgrades: RuntimeUpgrades): RuntimeUpgrades {
  const currentVersion = semver.coerce(version)
  if (!currentVersion) {
    throw new Error(`Unsupported version format: ${version}`)
  }
  return rUpgrades.filter((rUpgrade) => semver.gt(rUpgrade.version, currentVersion))
}
