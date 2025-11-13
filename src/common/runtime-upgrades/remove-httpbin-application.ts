import { terminal } from '../debug'
import { k8s } from '../k8s'

const namespace = 'httpbin'
const httpbinAppName = 'httpbin'

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
    d.info('Deleted httpbin ArgoCD application.')
  } catch (err) {
    d.error('Error deleting httpbin application:', err)
  }
  d.info('Successfully deleted httpbin resources')
}
