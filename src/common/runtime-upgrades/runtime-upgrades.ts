import { OtomiDebugger } from '../debug'
import { applyServerSide, k8s, restartOtomiApiDeployment } from '../k8s'
import { getParsedArgs } from '../yargs'
import { detectAndRestartOutdatedIstioSidecars } from './restart-istio-sidecars'
import { upgradeKnativeServing } from './upgrade-knative-serving-cr'
import { ApiException, PatchStrategy, setHeaderOptions } from '@kubernetes/client-node'

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
  {
    version: '4.12.0',
    pre: async (context: RuntimeUpgradeContext) => {
      const namespaces = ['ingress', 'istio-system']
      await Promise.all(
        namespaces.map(async (namespace) => {
          context.debug.info(`Updating label for namespace ${namespace}`)
          await k8s.core().patchNamespace(
            {
              name: namespace,
              body: {
                metadata: {
                  labels: {
                    'apl.io/ingress-controller-scope': 'true',
                  },
                },
              },
            },
            setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
          )
        }),
      )
      // Perform manual patch as ArgoCD does not perform diffs on annotations
      context.debug.info("Removing obsolete annotation from Ingress 'oauth2-proxy'")
      try {
        await k8s.networking().patchNamespacedIngress(
          {
            namespace: 'istio-system',
            name: 'oauth2-proxy',
            body: [{ op: 'remove', path: '/metadata/annotations/nginx.ingress.kubernetes.io/configuration-snippet' }],
          },
          setHeaderOptions('Content-Type', PatchStrategy.JsonPatch),
        )
      } catch (error) {
        if (error instanceof ApiException && error.code !== 404) {
          context.debug.error("Failed to patch ingress 'oauth2-proxy'", error)
        } else {
          context.debug.info("Ingress 'oauth2-proxy' not found, patch not required")
        }
      }
    },
  },
]
