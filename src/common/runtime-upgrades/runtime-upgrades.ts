import { $ } from 'zx'
import { OtomiDebugger } from '../debug'
import { applyServerSide, k8s, restartOtomiApiDeployment } from '../k8s'
import { getParsedArgs } from '../yargs'
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

      try {
        const exists = await $`kubectl get knativeserving knative-serving -n knative-serving`
          .then(() => true)
          .catch(() => false)
        if (!exists) {
          context.debug.info('KnativeServing CR not found, skipping upgrade.')
          return
        }
        for (const version of ['v1.16.0', 'v1.17.0', 'v1.18.0']) {
          context.debug.info(`Patching to ${version}...`)
          await $`kubectl patch knativeserving knative-serving -n knative-serving --type=merge -p {"spec":{"version":"${version}"}}`

          context.debug.info(`Waiting for Ready status...`)
          for (let i = 0; i < 60; i++) {
            const status =
              await $`kubectl get knativeserving knative-serving -n knative-serving -o jsonpath="{.status.conditions[?(@.type=='Ready')].status}"`.quiet()
            if (status.stdout.trim() === 'True') break
            await new Promise((res) => setTimeout(res, 5000))
            if (i === 29) throw new Error(`Timeout waiting for KnativeServing to become Ready after ${version}`)
          }
          context.debug.info(`Upgraded to ${version}.`)
        }
      } catch (err) {
        context.debug.error('KnativeServing upgrade failed:', err)
      }
    },
  },
]
