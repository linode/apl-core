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

      const group = 'operator.knative.dev'
      const version = 'v1beta1'
      const plural = 'knativeservings'
      const name = 'knative-serving'
      const namespace = 'knative-serving'
      const client = k8s.custom()

      try {
        try {
          await client.getNamespacedCustomObject({
            group,
            version,
            namespace,
            plural,
            name,
          })
        } catch {
          context.debug.info('KnativeServing CR not found, skipping upgrade.')
          return
        }

        for (const targetVersion of ['1.16', '1.17', '1.18']) {
          context.debug.info(`Patching KnativeServing to ${targetVersion}...`)
        await client.patchNamespacedCustomObject({
          group,
          version,
          namespace,
          plural,
          name,
          body: [
              { op: 'replace', path: '/spec/version', value: targetVersion }
            ],
        })

        context.debug.info(`Waiting for Ready condition after ${targetVersion}...`)
        let ready = false
        for (let i = 0; i < 15; i++) {
          await new Promise((res) => setTimeout(res, 5000))
          try {
            const res: any = await client.getNamespacedCustomObject({group, version, namespace, plural, name})
            const conditions = res.status.conditions
            const newVersion = (res.status.version || '').split('.').slice(0, 2).join('.')
            const readyCond = conditions.find((c: any) => c.type === 'Ready')
            if (readyCond?.status === 'True' && newVersion === targetVersion) {
              ready = true
              break
            }
          } catch {
          }
        }

        if (!ready) {
          throw new Error(`Timeout waiting for KnativeServing to be Ready after upgrade to ${targetVersion}`)
        }

        context.debug.info(`Upgrade to ${targetVersion} completed.`)
        }
      } catch (err) {
        context.debug.error('KnativeServing upgrade failed:', err)
      }
    },
  },
]
