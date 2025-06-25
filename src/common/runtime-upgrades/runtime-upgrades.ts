import { OtomiDebugger } from '../debug'
import { k8s, restartOtomiApiDeployment } from '../k8s'
import { detectAndRestartOutdatedIstioSidecars } from './restart-istio-sidecars'

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
]
