import { getDeploymentState, waitForArgoCDAppHealthy, waitForArgoCDAppSync } from './k8s'
import { isEmpty } from 'lodash'
import { getCurrentVersion } from './values'
import { RuntimeUpgradeContext, RuntimeUpgrades, runtimeUpgrades } from './runtime-upgrades/runtime-upgrades'
import { terminal } from './debug'
import semver from 'semver'

interface RuntimeUpgradeArgs {
  when: string
}

export async function runtimeUpgrade({ when }: RuntimeUpgradeArgs): Promise<void> {
  const d = terminal('cmd:upgrade:runtimeUpgrade')
  const deploymentState = await getDeploymentState()

  if (isEmpty(deploymentState)) {
    d.info('Skipping the runtime upgrade procedure as this is the very first installation')
    return
  }

  const version = await getCurrentVersion()
  const prevVersion: string = deploymentState.version ?? version

  d.info(`Current version of otomi: ${prevVersion}`)

  const filteredUpgrades = filterRuntimeUpgrades(prevVersion, runtimeUpgrades)

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
      for (const [applicationName, applicationUpgrade] of Object.entries(upgrade.applications)) {
        const applicationOperation = applicationUpgrade[when as keyof typeof applicationUpgrade] as (
          context: RuntimeUpgradeContext,
        ) => Promise<void>
        if (applicationOperation && typeof applicationOperation === 'function') {
          d.info(`Runtime upgrade operations detected for version ${upgrade.version}, application: ${applicationName}`)
          // Wait for the ArgoCD app to be synced and healthy before running the operation
          await waitForArgoCDAppSync(applicationName)
          await waitForArgoCDAppHealthy(applicationName)
          //execute the application-specific operation
          await applicationOperation(context)
        }
      }
    }
  }
}

export function filterRuntimeUpgrades(version: string, upgrades: RuntimeUpgrades): RuntimeUpgrades {
  // Prereleases such as v1.0-rc1 are not a complete semantic version - changing these to v1.0.0-rc1
  const prereleaseMatch = version.match(/^[0-9]+\.[0-9]+(-[a-zA-Z]+\.?[0-9]+)$/)
  const currentVersion = prereleaseMatch ? version.replace(prereleaseMatch[1], `.0${prereleaseMatch[1]}`) : version
  return upgrades.filter((c) => c.version === 'dev' || semver.gt(c.version, currentVersion))
}
