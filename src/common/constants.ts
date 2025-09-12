export const DEPLOYMENT_PASSWORDS_SECRET = 'otomi-generated-passwords'
export const DEPLOYMENT_STATUS_CONFIGMAP = 'otomi-status'
export const ARGOCD_APP_PARAMS = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  namespace: 'argocd',
  plural: 'applications',
}
