import { ApiException, CoreV1Api, KubeConfig } from '@kubernetes/client-node'
import { writeFileSync } from 'fs'
import { APL_OPERATOR_NS } from '../common/constants'
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

/**
 * Marker file that signals platform installation has completed. The operator
 * readinessProbe gates on its existence, so the apl-operator Deployment only
 * becomes Available once the helmfile pipeline has actually converged — not
 * merely once the operator process is up. That makes `helm install --wait` and
 * `kubectl wait --for=condition=Available deployment/apl-operator` meaningful
 * gates for bootstrap automation.
 *
 * The marker lives on the pod's /tmp emptyDir, so it is cleared on every
 * restart and re-created as soon as the operator re-confirms the installation
 * status from the apl-installation-status ConfigMap.
 */
export const READINESS_FILE = '/tmp/ready'

/**
 * Writes the readiness marker. Called once installation has reached the
 * 'completed' state — including on restarts of an already-installed cluster.
 * Readiness latches: it is intentionally NOT cleared while a subsequent apply
 * runs, because steady-state reconcile loops must not flap the Deployment's
 * Available condition. Per-apply status lives in the apl-operator-state
 * ConfigMap instead.
 */
export function markInstallationComplete(filePath: string = READINESS_FILE): void {
  const d = terminal('operator:k8s:markInstallationComplete')
  try {
    writeFileSync(filePath, new Date().toISOString())
    d.info(`Installation complete, wrote readiness marker ${filePath}`)
  } catch (error) {
    // Deliberately non-fatal: a missing marker keeps the pod NotReady, which is
    // the safe direction — it never reports convergence that did not happen.
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
