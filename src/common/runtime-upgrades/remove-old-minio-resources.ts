import { AppsV1Api, BatchV1Api, KubeConfig } from '@kubernetes/client-node'
import { terminal } from '../debug'

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()

const appsApi = kubeConfig.makeApiClient(AppsV1Api)
const batchApi = kubeConfig.makeApiClient(BatchV1Api)

const namespace = 'minio'
const minioDeploymentName = 'minio'
const minioPostJobName = 'minio-post-job'
const minioAppName = 'minio-minio'
const minioProvisioningJobName = 'minio-provisioning'

export async function removeOldMinioResources() {
  const d = terminal('removeOldMinioResources')
  try {
    // Disable argocd auto-sync for minio application if it exists
    await kubeConfig.makeApiClient(AppsV1Api).patchNamespacedDeployment({
      namespace,
      name: minioAppName,
      body: [
        {
          op: 'remove',
          path: '/spec/syncPolicy/automated',
        },
      ],
    })
    d.info('Disabled auto-sync for minio deployment.')
  } catch (error) {
    d.error('Failed to disable auto-sync for minio deployment:', error)
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
}
