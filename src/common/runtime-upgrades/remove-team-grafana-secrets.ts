import { ApiException, CoreV1Api } from '@kubernetes/client-node'
import { terminal } from '../debug'
import { k8s } from '../k8s'

const TEAM_NAMESPACE_PREFIX = 'team-'
// ESO labels every secret it pushed; filtering on it avoids touching a secret a team made itself.
const ESO_MANAGED_LABEL = 'reconcile.external-secrets.io/managed=true'
const FIXED_GRAFANA_SECRET_NAMES = ['grafana-oidc-secret', 'grafana-loki-datasource-secret']

const isOrphanedGrafanaSecret = (name: string, namespace: string): boolean =>
  name === `${namespace}-grafana-admin` || FIXED_GRAFANA_SECRET_NAMES.includes(name)

/**
 * Removes the team Grafana secrets left behind in 'team-*' namespaces after Grafana moved to the
 * 'grafana' namespace. The old PushSecrets pushed '<team-ns>-grafana-admin', 'grafana-oidc-secret'
 * and 'grafana-loki-datasource-secret' into each team namespace. On upgrade the PushSecrets are
 * pruned, but ESO's deletion finalizer races ArgoCD and can leave the pushed secrets orphaned.
 * They are ESO-managed and no longer consumed, so delete them directly.
 */
export const removeTeamGrafanaSecrets = async (
  deps = {
    getCoreApi: (): CoreV1Api => k8s.core(),
  },
): Promise<void> => {
  const log = terminal('removeTeamGrafanaSecrets')
  const coreApi = deps.getCoreApi()

  const { items: secrets } = await coreApi.listSecretForAllNamespaces({ labelSelector: ESO_MANAGED_LABEL })
  const orphans = secrets.filter((secret) => {
    const { name, namespace } = secret.metadata ?? {}
    return (
      !!name && !!namespace && namespace.startsWith(TEAM_NAMESPACE_PREFIX) && isOrphanedGrafanaSecret(name, namespace)
    )
  })

  await Promise.allSettled(
    orphans.map(async (secret) => {
      const name = secret.metadata!.name!
      const namespace = secret.metadata!.namespace!
      log.info(`Removing orphaned Grafana secret ${namespace}/${name}`)
      try {
        await coreApi.deleteNamespacedSecret({ name, namespace })
      } catch (e) {
        if (e instanceof ApiException && e.code === 404) return
        log.warn(`Failed to remove secret ${namespace}/${name}:`, e)
      }
    }),
  )
}
