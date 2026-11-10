import { ApiException, RbacAuthorizationV1Api } from '@kubernetes/client-node'
import { terminal } from '../debug'
import { k8s } from '../k8s'

const TEAM_NAMESPACE_PREFIX = 'team-'
const TTY_ROLE_BINDING_PREFIX = 'tty-'

/**
 * Removes all RoleBindings starting with 'tty-' from all 'team-*' namespaces.
 */
export const removeTtyRoleBindings = async (
  deps = {
    getRbacApi: (): RbacAuthorizationV1Api => k8s.kc().makeApiClient(RbacAuthorizationV1Api),
  },
): Promise<void> => {
  const log = terminal('removeTtyRoleBindings')
  const rbacApi = deps.getRbacApi()

  const { items: roleBindings } = await rbacApi.listRoleBindingForAllNamespaces()
  const ttyRoleBindings = roleBindings.filter((roleBinding) => {
    const { name, namespace } = roleBinding.metadata ?? {}
    return (
      !!name &&
      !!namespace &&
      namespace.startsWith(TEAM_NAMESPACE_PREFIX) &&
      name.startsWith(TTY_ROLE_BINDING_PREFIX) &&
      name !== 'tty-admin'
    )
  })

  await Promise.allSettled(
    ttyRoleBindings.map(async (roleBinding) => {
      const name = roleBinding.metadata!.name!
      const namespace = roleBinding.metadata!.namespace!
      log.info(`Removing RoleBinding ${namespace}/${name}`)
      try {
        await rbacApi.deleteNamespacedRoleBinding({ name, namespace })
      } catch (e) {
        if (e instanceof ApiException && e.code === 404) return
        log.warn(`Failed to remove RoleBinding ${namespace}/${name}:`, e)
      }
    }),
  )
}
