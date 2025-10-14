import { AppsV1Api, KubeConfig } from '@kubernetes/client-node'
import { terminal } from '../debug'
import { k8s, setArgoCdAppSync } from '../k8s'

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()

const appsApi = kubeConfig.makeApiClient(AppsV1Api)

const namespace = 'minio'
const minioDeploymentName = 'minio'
const minioAppName = 'minio-minio'

export async function removeOldMinioResources() {
  const d = terminal('removeOldMinioResources')
  try {
    const minioDeployment = await appsApi.readNamespacedDeployment({ name: minioDeploymentName, namespace })
    if (minioDeployment.metadata?.labels?.chart === 'minio-5.4.0') {
      d.info('Minio deployment is up-to-date, no need to remove old resources.')
      return
    }
    // Disable argocd auto-sync for minio application if it exists
    await setArgoCdAppSync(minioAppName, false, k8s.custom())
    d.info('Disabled auto-sync for minio application.')
  } catch (error) {
    d.error('Failed to disable auto-sync for minio application:', error)
  }
  try {
    // Delete Minio Deployment
    await appsApi.deleteNamespacedDeployment({
      name: minioDeploymentName,
      namespace,
    })
    d.info('Deleted minio deployment.')
  } catch (err) {
    d.error('Error deleting resources:', err)
  }
  try {
    // Re-enable argocd auto-sync for minio application on the off chance that it is stuck in a bad state
    await setArgoCdAppSync(minioAppName, true, k8s.custom())
    d.info('Re-enabled auto-sync for minio application.')
  } catch (error) {
    d.error('Failed to re-enable auto-sync for minio application:', error)
  }
  d.info('Successfully deleted minio resources')
}
