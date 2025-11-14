import { terminal } from '../debug'
import { k8s } from '../k8s'
import { ARGOCD_APP_PARAMS } from '../constants'

const httpbinAppName = 'httpbin-httpbin'

export async function removeHttpBinApplication() {
  const d = terminal('removeHttpBinApplication')
  try {
    // Delete httpbin ArgoCD application
    const custom = k8s.custom()
    await custom.deleteNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      name: httpbinAppName,
    })
    d.info(`Deleted ${httpbinAppName} ArgoCD application.`)
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.response?.statusCode === 404) {
      d.debug(`${httpbinAppName} application not found in ${ARGOCD_APP_PARAMS.namespace} namespace, skipping deletion.`)
    } else {
      d.error('Error deleting httpbin application:', err)
    }
  }
}
