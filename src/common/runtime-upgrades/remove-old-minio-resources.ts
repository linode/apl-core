import { AppsV1Api, BatchV1Api, KubeConfig } from '@kubernetes/client-node'
import { terminal } from '../debug'

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()

const appsApi = kubeConfig.makeApiClient(AppsV1Api)
const batchApi = kubeConfig.makeApiClient(BatchV1Api)

const namespace = 'minio'
const minioDeploymentName = 'minio-minio'
const minioPostJobName = 'minio-post-job'
const minioProvisioningJobName = 'minio-provisioning'

export async function removeOldMinioResources() {
  const d = terminal('removeOldMinioResources')
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
    // Delete minio-post-job
    await batchApi.deleteNamespacedJob({
      name: minioPostJobName,
      namespace,
    })
    d.info('Deleted minio-post-job.')
  } catch (err) {
    d.error('Error deleting resources:', err)
  }
  try {
    // Delete minio-provisioning job
    await batchApi.deleteNamespacedJob({
      name: minioProvisioningJobName,
      namespace,
    })
    d.info('Deleted minio-provisioning job.')
  } catch (err) {
    d.error('Error deleting resources:', err)
  }
}
