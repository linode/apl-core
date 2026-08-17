import { ApiextensionsV1Api, CoreV1Api, PatchStrategy, setHeaderOptions } from '@kubernetes/client-node'
import { terminal } from '../debug'
import { k8s } from '../k8s'

const LAST_APPLIED_ANNOTATION = 'kubectl.kubernetes.io/last-applied-configuration'
// JSON Patch requires '/' in key names to be escaped as '~1'
const LAST_APPLIED_PATCH_PATH = '/metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration'

export const stripOversizedLastAppliedAnnotations = async (
  deps = {
    getCrdApi: (): ApiextensionsV1Api => k8s.kc().makeApiClient(ApiextensionsV1Api),
    getCoreApi: (): CoreV1Api => k8s.core(),
  },
): Promise<void> => {
  const log = terminal('common:runtime-upgrades:stripOversizedAnnotations')
  const patchHeaders = setHeaderOptions('Content-Type', PatchStrategy.JsonPatch)
  const removePatch = [{ op: 'remove', path: LAST_APPLIED_PATCH_PATH }]

  const crdApi = deps.getCrdApi()
  const { items: crds } = await crdApi.listCustomResourceDefinition()
  await Promise.allSettled(
    crds
      .filter((crd) => {
        const value = crd.metadata?.annotations?.[LAST_APPLIED_ANNOTATION]
        return value !== undefined
      })
      .map(async (crd) => {
        const name = crd.metadata!.name!
        log.info(`Stripping oversized last-applied-configuration from CRD ${name}`)
        await crdApi.patchCustomResourceDefinition({ name, body: removePatch }, patchHeaders)
      }),
  )

  const coreApi = deps.getCoreApi()
  const { items: configMaps } = await coreApi.listConfigMapForAllNamespaces()
  await Promise.allSettled(
    configMaps
      .filter((cm) => {
        const value = cm.metadata?.annotations?.[LAST_APPLIED_ANNOTATION]
        return value !== undefined
      })
      .map(async (cm) => {
        const name = cm.metadata!.name!
        const namespace = cm.metadata!.namespace!
        log.info(`Stripping oversized last-applied-configuration from ConfigMap ${namespace}/${name}`)
        await coreApi.patchNamespacedConfigMap({ name, namespace, body: removePatch }, patchHeaders)
      }),
  )
}
