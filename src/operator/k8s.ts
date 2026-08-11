import { ApiException, CoreV1Api, KubeConfig } from '@kubernetes/client-node'
import { writeFileSync } from 'fs'
import { APL_OPERATOR_NS, PLATFORM_AUTH_RESTART_STATE_CM } from '../common/constants'
import { terminal } from '../common/debug'
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

/**
 * Writes an empty file to /tmp/heartbeat to update its modification timestamp.
 * Kubernetes liveness probes check this file's age to determine if the operator
 * is still functioning — a stale or missing file will cause the probe to fail.
 */
export function updateHeartbeatFile(): void {
  writeFileSync('/tmp/heartbeat', '')
}

export const READINESS_FILE = '/tmp/ready'

/**
 * Idempotent, and safe to call on every apply. Readiness latches: the marker is never
 * cleared while a later apply runs, because the steady-state reconcile loop would
 * otherwise flap the Deployment's Available condition. Per-apply status lives in the
 * apl-operator-state ConfigMap.
 */
export function markOperatorReady(filePath: string = READINESS_FILE): void {
  const d = terminal('operator:k8s:markOperatorReady')
  try {
    writeFileSync(filePath, new Date().toISOString())
    d.info(`Wrote readiness marker ${filePath}`)
  } catch (error) {
    // Non-fatal: a missing marker keeps the pod NotReady, which is the safe direction.
    d.warn(`Failed to write readiness marker ${filePath}:`, getErrorMessage(error))
  }
}

export async function updateApplyState(
  state: ApplyState,
  namespace: string = APL_OPERATOR_NS,
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
    updateHeartbeatFile()
  } catch (error) {
    d.error('Failed to update apply state:', getErrorMessage(error))
  }
}

export async function hasPlatformAuthPodsRestarted(
  namespace: string = APL_OPERATOR_NS,
  configMapName: string = PLATFORM_AUTH_RESTART_STATE_CM,
): Promise<boolean> {
  try {
    await k8s.core().readNamespacedConfigMap({ name: configMapName, namespace })
    return true
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) return false
    throw error
  }
}

export async function markPlatformAuthPodsRestarted(
  namespace: string = APL_OPERATOR_NS,
  configMapName: string = PLATFORM_AUTH_RESTART_STATE_CM,
): Promise<void> {
  try {
    await k8s.core().createNamespacedConfigMap({
      namespace,
      body: { metadata: { name: configMapName } },
    })
  } catch (error) {
    if (error instanceof ApiException && error.code === 409) return
    throw error
  }
}
