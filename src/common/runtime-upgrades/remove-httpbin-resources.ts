import { ApiException } from '@kubernetes/client-node'
import { k8s } from '../k8s'
import { RuntimeUpgradeContext } from './runtime-upgrades'

export async function deleteHttpbinResources(context: RuntimeUpgradeContext) {
  const d = context.debug
  const appApi = k8s.app()
  const coreApi = k8s.core()
  const namespace = 'httpbin'

  d.info('Removing httpbin deployment and service')

  // Delete httpbin deployment
  try {
    await appApi.deleteNamespacedDeployment({ name: 'httpbin', namespace })
    d.log(`Deleted httpbin deployment in namespace ${namespace}`)
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      d.info('httpbin deployment not found, skipping deletion')
    } else {
      d.error('Failed to delete httpbin deployment:', (error as any).body || error)
    }
  }

  // Delete httpbin service
  try {
    await coreApi.deleteNamespacedService({ name: 'httpbin', namespace })
    d.log(`Deleted httpbin service in namespace ${namespace}`)
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      d.info('httpbin service not found, skipping deletion')
    } else {
      d.error('Failed to delete httpbin service:', (error as any).body || error)
    }
  }
}
