import { CoreV1Api } from '@kubernetes/client-node'
import { getParsedArgs } from '../yargs'
import { terminal } from '../debug'
import { getWorkloadKeyFromPod, restartPodOwner } from './restart-istio-sidecars'

export const PLATFORM_AUTH_LABEL_SELECTOR = 'otomi.io/auth=platform'

export async function restartPlatformAuthPods(
  coreV1Api: CoreV1Api,
  deps = { getWorkloadKeyFromPod, restartPodOwner },
): Promise<void> {
  const d = terminal('restartPlatformAuthPods')
  const parsedArgs = getParsedArgs()

  const podsResponse = await coreV1Api.listPodForAllNamespaces({ labelSelector: PLATFORM_AUTH_LABEL_SELECTOR })
  const pods = podsResponse.items

  d.info(`Found ${pods.length} pods labelled ${PLATFORM_AUTH_LABEL_SELECTOR}`)

  const restartedWorkloads = new Set<string>()

  for (const pod of pods) {
    const workloadKey = deps.getWorkloadKeyFromPod(pod)
    if (workloadKey && restartedWorkloads.has(workloadKey)) continue

    await deps.restartPodOwner(pod, d, parsedArgs)
    if (workloadKey) restartedWorkloads.add(workloadKey)
  }

  d.info(`Restarted ${restartedWorkloads.size} workloads with platform-auth pods`)
}
