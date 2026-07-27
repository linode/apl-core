import { OtomiDebugger } from '../debug'
import { k8s } from '../k8s'
import { detectAndRestartOutdatedIstioSidecars } from './restart-istio-sidecars'
import { stripOversizedLastAppliedAnnotations } from './v6.2.0'

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
    version: '6.0.1',
    applications: {
      'istio-system-istiod': {
        post: async () => {
          await detectAndRestartOutdatedIstioSidecars(k8s.core())
        },
      },
    },
  },
  {
    version: '6.2.0',
    pre: async ({ debug }) => {
      await stripOversizedLastAppliedAnnotations().catch((e) => debug.warn('Failed to strip oversized annotations:', e))
    },
  },
]
