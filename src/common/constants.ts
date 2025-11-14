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

export interface ObjectMetadata {
  metadata: {
    name: string
    namespace?: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
    ownerReferences?: Array<Record<string, string>>
  }
}
export interface ObjectMetadataCollection {
  items: Array<ObjectMetadata>
}
