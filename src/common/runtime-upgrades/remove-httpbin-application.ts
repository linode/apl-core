import { terminal } from '../debug'
import { k8s } from '../k8s'

const namespace = 'argocd'
const httpbinAppName = 'httpbin-httpbin'

export async function removeHttpBinApplication() {
  const d = terminal('removeHttpBinApplication')
  try {
    // Delete httpbin ArgoCD application
    const custom = k8s.custom()
    await custom.deleteNamespacedCustomObject({
      group: 'argoproj.io',
      version: 'v1alpha1',
      namespace,
      plural: 'applications',
      name: httpbinAppName,
    })
    d.info(`Deleted ${httpbinAppName} ArgoCD application.`)
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.response?.statusCode === 404) {
      d.info(`${httpbinAppName} application not found in ${namespace} namespace, skipping deletion.`)
    } else {
      d.error('Error deleting httpbin application:', err)
    }
  }
  d.info('Successfully deleted httpbin Application')
}
