import { OtomiDebugger } from '../debug'
import { applyServerSide, k8s, restartOtomiApiDeployment } from '../k8s'
import { getParsedArgs } from '../yargs'
import { detectAndRestartOutdatedIstioSidecars } from './restart-istio-sidecars'
import { upgradeKnativeServing } from './upgrade-knative-serving-cr'

export interface RuntimeUpgradeContext {
  debug: OtomiDebugger
}

export interface RuntimeUpgradeApplication {
  pre?: (context: RuntimeUpgradeContext) => Promise<void>
  post?: (context: RuntimeUpgradeContext) => Promise<void>
}

export interface RuntimeUpgrade {
  version: string
  applications?: Record<string, RuntimeUpgradeApplication>
  pre?: (context: RuntimeUpgradeContext) => Promise<void>
  post?: (context: RuntimeUpgradeContext) => Promise<void>
}

export type RuntimeUpgrades = Array<RuntimeUpgrade>

/**
 * Runtime upgrades defined in TypeScript with compile-time type safety.
 * Each upgrade operation receives a context object with debug logger, deployment state, values, and dry-run flag.
 */
export const runtimeUpgrades: RuntimeUpgrades = [
  {
    version: '4.7.0',
    applications: {
      'keycloak-keycloak': {
        post: async (context: RuntimeUpgradeContext) => {
          try {
            await restartOtomiApiDeployment(k8s.app())
          } catch (error) {
            context.debug.error('Failed to check and restart otomi-api:', error)
          }
        },
      },
      'istio-system-istiod': {
        post: async (context: RuntimeUpgradeContext) => {
          try {
            await detectAndRestartOutdatedIstioSidecars(k8s.core())
          } catch (error) {
            context.debug.error('Failed to check and restart outdated Istio sidecars:', error)
          }
        },
      },
    },
  },
  {
    version: '4.8.0',
    pre: async (context: RuntimeUpgradeContext) => {
      const path = 'charts/kube-prometheus-stack/charts/crds/crds'
      context.debug.info(`Applying CRDs at ${path}`)
      try {
        const parsedArgs = getParsedArgs()
        await applyServerSide(path, true, (parsedArgs?.dryRun || parsedArgs?.local) as boolean)
      } catch (error) {
        context.debug.error('Failed to apply CRDs:', error)
      }
      await upgradeKnativeServing(context)
    },
  },
  {
    version: '4.11.0',
    applications: {
      'istio-system-istiod': {
        post: async () => {
          await detectAndRestartOutdatedIstioSidecars(k8s.core())
        },
      },
    },
  },
]
