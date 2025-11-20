import { terminal } from '../common/debug'
import { ApiException, CoreV1Api, KubeConfig } from '@kubernetes/client-node'
import { getErrorMessage } from './utils'

export type ApplyStatus = 'succeeded' | 'failed' | 'in-progress' | 'unknown'

export interface ApplyState {
  commitHash: string
  status: ApplyStatus
  timestamp: string
  trigger?: string
  errorMessage?: string
}

let kc: KubeConfig
let coreClient: CoreV1Api
export const k8s = {
  kc: (): KubeConfig => {
    if (kc) return kc
    kc = new KubeConfig()
    kc.loadFromDefault()
    return kc
  },
  core: (): CoreV1Api => {
    if (coreClient) return coreClient
    coreClient = k8s.kc().makeApiClient(CoreV1Api)
    return coreClient
  },
}

export async function updateApplyState(
  state: ApplyState,
  namespace: string = 'apl-operator',
  configMapName: string = 'apl-operator-state',
): Promise<void> {
  const d = terminal('operator:k8s:updateApplyState')

  try {
    d.info(`Updating Apply status: ${state.status} for commit ${state.commitHash}`)

    const k8sClient = k8s.core()
    const stateJson = JSON.stringify(state)

    try {
      const existingConfigMap = await k8sClient.readNamespacedConfigMap({ name: configMapName, namespace })

      // Update the existing ConfigMap
      if (!existingConfigMap.data) {
        existingConfigMap.data = {}
      }

      existingConfigMap.data['state'] = stateJson

      await k8sClient.replaceNamespacedConfigMap({ name: configMapName, namespace, body: existingConfigMap })
    } catch (error) {
      if (error instanceof ApiException && error.code === 404) {
        await k8sClient.createNamespacedConfigMap({
          namespace,
          body: {
            metadata: {
              name: configMapName,
            },
            data: {
              state: stateJson,
            },
          },
        })
      } else {
        throw error
      }
    }

    d.info(`Apply state updated for commit ${state.commitHash}`)
  } catch (error) {
    d.error('Failed to update apply state:', getErrorMessage(error))
  }
}
