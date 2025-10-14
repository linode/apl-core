export const DEPLOYMENT_PASSWORDS_SECRET = 'otomi-generated-passwords'
export const DEPLOYMENT_STATUS_CONFIGMAP = 'otomi-status'
export const ARGOCD_APP_PARAMS = {
  group: 'argoproj.io',
  version: 'v1alpha1',
  namespace: 'argocd',
  plural: 'applications',
}
export const ARGOCD_APP_DEFAULT_SYNC_POLICY = {
  automated: {
    prune: true,
    allowEmpty: false,
    selfHeal: true,
  },
  syncOptions: ['ServerSideApply=true'],
}
