import { OtomiDebugger } from '../debug'
import { k8s } from '../k8s'
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
  // Example upgrade - can be removed when real upgrades are added
  {
    version: 'example',
    pre: async (context: RuntimeUpgradeContext) => {
      context.debug.info('Example pre-upgrade operation for development')
      // Actual upgrade operations would go here
    },
    post: async (context: RuntimeUpgradeContext) => {
      context.debug.info('Example post-upgrade operation for development')
      // Actual upgrade operations would go here
    },
    applications: {
      'example-app': {
        pre: async (context: RuntimeUpgradeContext) => {
          context.debug.info('Example app pre-upgrade operation for development')
          // Actual app-specific pre-upgrade operations would go here
        },
        post: async (context: RuntimeUpgradeContext) => {
          context.debug.info('Example app post-upgrade operation for development')
          // Actual app-specific post-upgrade operations would go here
        },
      },
    },
  },
  {
    version: '4.8.0',
    applications: {
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
