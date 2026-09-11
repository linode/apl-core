import { OtomiDebugger } from '../debug'
import { k8s } from '../k8s'
import { detectAndRestartOutdatedIstioSidecars } from './restart-istio-sidecars'
import { stripOversizedLastAppliedAnnotations } from './strip-oversized-annotations'

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
    version: '6.3.0',
    pre: async ({ debug }) => {
      await stripOversizedLastAppliedAnnotations().catch((e) => debug.warn('Failed to strip oversized annotations:', e))
    },
    post: async ({ debug }) => {
      // Wait until all Applications have been applied, but do not wait for sync.
      // Delete Gitea deployment and Valkey, as ArgoCD fails to update it incrementally after migrating secrets to generated ones.
      try {
        await k8s.app().deleteNamespacedDeployment({ name: 'gitea', namespace: 'gitea' })
      } catch (e) {
        if (e.response?.statusCode !== 404) {
          debug.warn('Failed to delete Gitea deployment:', e)
        }
      }
      try {
        await k8s.app().deleteNamespacedStatefulSet({ name: 'gitea-valkey-primary', namespace: 'gitea' })
      } catch (e) {
        if (e.response?.statusCode !== 404) {
          debug.warn('Failed to delete Gitea Valkey StatefulSet:', e)
        }
      }
    },
    applications: {
      'istio-system-istiod': {
        post: async () => {
          await detectAndRestartOutdatedIstioSidecars(k8s.core())
        },
      },
    },
  },
]
