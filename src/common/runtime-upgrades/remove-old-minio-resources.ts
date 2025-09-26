import { AppsV1Api, KubeConfig } from '@kubernetes/client-node'
import { terminal } from '../debug'
import { k8s } from '../k8s'

const kubeConfig = new KubeConfig()
kubeConfig.loadFromDefault()

const appsApi = kubeConfig.makeApiClient(AppsV1Api)

const namespace = 'minio'
const minioDeploymentName = 'minio'
const minioAppName = 'minio-minio'

export async function removeOldMinioResources() {
  const d = terminal('removeOldMinioResources')
  try {
    // Disable argocd auto-sync for minio application if it exists
    const patch = [{ op: 'remove', path: '/spec/syncPolicy/automated' }]
    const custom = k8s.custom()
    await custom.patchNamespacedCustomObject({
      group: 'argoproj.io',
      version: 'v1alpha1',
      namespace: 'argocd',
      plural: 'applications',
      name: minioAppName,
      body: patch,
    })
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
}
