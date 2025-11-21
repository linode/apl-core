import { CoreV1Api, PatchStrategy, setHeaderOptions, V1OwnerReference, V1Pod } from '@kubernetes/client-node'
import { getDeploymentState, k8s } from '../k8s'
import { OtomiDebugger, terminal } from '../debug'
import { getParsedArgs } from '../yargs'
import { $ } from 'zx'

export function getWorkloadKeyFromPod(pod: V1Pod): string | null {
  if (!pod.metadata?.ownerReferences || !pod.metadata?.namespace) return null

  for (const ownerRef of pod.metadata.ownerReferences) {
    // Direct workload owners
    if ((ownerRef.kind === 'StatefulSet' || ownerRef.kind === 'Cluster') && ownerRef.name) {
      return `${pod.metadata.namespace}/${ownerRef.name}`
    }
    // For Deployments via ReplicaSet, extract deployment name from ReplicaSet name
    // ReplicaSet names follow pattern: <deployment-name>-<hash> where hash is 8-10 alphanumeric chars
    if (ownerRef.kind === 'ReplicaSet' && ownerRef.name) {
      const deploymentName = getDeploymentNameFromReplicaSet(ownerRef.name)
      if (deploymentName) {
        return `${pod.metadata.namespace}/${deploymentName}`
      }
    }
  }

  return null
}

export function getDeploymentNameFromReplicaSet(replicaSetName: string): string | null {
  // ReplicaSet names follow pattern: <deployment-name>-<hash>
  // Hash is typically 8-10 characters of lowercase alphanumeric
  const match = replicaSetName.match(/^(.+)-[a-z0-9]{8,10}$/)
  return match ? match[1] : null
}

export async function getIstioVersionFromDeployment(): Promise<string | null> {
  try {
    const appApi = k8s.app()

    // List all deployments in istio-system namespace to find istiod deployment
    const deploymentsResponse = await appApi.listNamespacedDeployment({
      namespace: 'istio-system',
    })

    // Find istiod deployment (name starts with 'istiod-' or exact match 'istiod')
    const istiodDeployment = deploymentsResponse.items.find(
      (deployment) => deployment.metadata?.name === 'istiod' || deployment.metadata?.name?.startsWith('istiod-'),
    )

    if (istiodDeployment) {
      const discoveryContainer = istiodDeployment.spec?.template?.spec?.containers?.find((c) => c.name === 'discovery')
      if (discoveryContainer?.image) {
        const imageTag = discoveryContainer.image.split(':').pop()
        if (imageTag && imageTag !== 'latest') {
          return imageTag
        }
      }
    }
  } catch (error) {
    throw error
  }

  return null
}

export async function detectAndRestartOutdatedIstioSidecars(
  coreV1Api: CoreV1Api,
  deps = {
    getDeploymentState,
    getWorkloadKeyFromPod,
    restartPodOwner,
    getIstioVersionFromDeployment,
  },
): Promise<void> {
  const d = terminal('detectAndRestartOutdatedIstioSidecars')
  const parsedArgs = getParsedArgs()

  try {
    // Get expected Istio version from istiod deployment
    const expectedVersion = await deps.getIstioVersionFromDeployment()

    if (!expectedVersion) {
      d.error('Could not determine expected Istio version from istiod deployment. Cannot restart sidecars.')
      return
    }

    d.debug(`Expected Istio sidecar image version: ${expectedVersion}`)

    // Get pods with Istio sidecar label selector
    const podsResponse = await coreV1Api.listPodForAllNamespaces({
      labelSelector: 'security.istio.io/tlsMode=istio',
    })
    const pods = podsResponse.items

    d.debug(`Found ${pods.length} pods with Istio sidecars`)

    const restartedDeployments = new Set<string>()

    for (const pod of pods) {
      if (!pod.spec?.containers && !pod.spec?.initContainers) {
        continue
      }

      // If this pod's workload was already restarted, skip it
      const workloadKey = deps.getWorkloadKeyFromPod(pod)
      if (workloadKey && restartedDeployments.has(workloadKey)) {
        continue
      }

      let hasOutdatedSidecar = false

      const allContainers = [...(pod.spec.containers || []), ...(pod.spec.initContainers || [])]
      for (const container of allContainers) {
        if (container.image?.includes('istio/proxyv2') || container.image?.includes('istio/proxy')) {
          if (!container.image.endsWith(`:${expectedVersion}`)) {
            d.info(
              `Outdated Istio sidecar found in pod ${pod.metadata?.namespace}/${pod.metadata?.name}: ${container.image} (expected version: ${expectedVersion})`,
            )
            hasOutdatedSidecar = true
            break
          }
        }
      }

      if (hasOutdatedSidecar) {
        await deps.restartPodOwner(pod, d, parsedArgs)
        restartedDeployments.add(workloadKey!)
      } else {
        const istioImages = allContainers
          .filter((c) => c.image?.includes('istio/proxyv2') || c.image?.includes('istio/proxy'))
          .map((c) => c.image)
          .join(', ')
        d.info(`Pod ${pod.metadata?.namespace}/${pod.metadata?.name} has up-to-date Istio sidecars: ${istioImages}`)
      }
    }

    if (restartedDeployments.size > 0) {
      d.info(`Restarted ${restartedDeployments.size} deployments with outdated Istio sidecars`)
    } else {
      d.info('All Istio sidecars are up to date')
    }
  } catch (error) {
    d.error('Error detecting and restarting outdated Istio sidecars:', error)
  }
}

export async function restartStatefulSet(
  ownerRef: V1OwnerReference,
  namespace: string,
  parsedArgs: any,
  d: any,
): Promise<void> {
  if (!parsedArgs?.dryRun && !parsedArgs?.local) {
    d.info(`Restarting StatefulSet ${ownerRef.name} in namespace ${namespace}`)
    const appApi = k8s.app()
    await appApi.patchNamespacedStatefulSet(
      {
        name: ownerRef.name,
        namespace,
        body: {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
                },
              },
            },
          },
        },
      },
      setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
    )
    d.info(`Successfully restarted StatefulSet ${ownerRef.name}`)
  } else {
    d.info(`Dry run mode - would restart StatefulSet ${ownerRef.name} in namespace ${namespace}`)
  }
}

export async function restartCluster(
  ownerRef: V1OwnerReference,
  namespace: string,
  parsedArgs: any,
  d: any,
): Promise<void> {
  if (!parsedArgs?.dryRun && !parsedArgs?.local) {
    d.info(`Restarting CloudNativePG Cluster ${ownerRef.name} in namespace ${namespace}`)
    await $`kubectl cnpg restart ${ownerRef.name} -n ${namespace}`
    d.info(`Successfully initiated rolling restart for Cluster ${ownerRef.name}`)
  } else {
    d.info(`Dry run mode - would restart CloudNativePG Cluster ${ownerRef.name} in namespace ${namespace}`)
  }
}

export async function restartDeployment(
  ownerRef: V1OwnerReference,
  namespace: string,
  parsedArgs: any,
  d: any,
): Promise<string | null> {
  const deploymentName = getDeploymentNameFromReplicaSet(ownerRef.name)

  if (!deploymentName) {
    d.info(`Could not extract deployment name from ReplicaSet ${ownerRef.name}, skipping restart`)
    return null
  }

  if (!parsedArgs?.dryRun && !parsedArgs?.local) {
    d.info(`Restarting deployment ${deploymentName} in namespace ${namespace}`)
    const appApi = k8s.app()
    await appApi.patchNamespacedDeployment(
      {
        name: deploymentName,
        namespace,
        body: {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
                },
              },
            },
          },
        },
      },
      setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
    )
    d.info(`Successfully restarted deployment ${deploymentName}`)
  } else {
    d.info(`Dry run mode - would restart deployment ${deploymentName} in namespace ${namespace}`)
  }

  return deploymentName
}

export function isPodManagedByTekton(pod: V1Pod): boolean {
  return (
    pod.metadata?.labels?.['app.kubernetes.io/managed-by'] === 'EventListener' ||
    pod.metadata?.labels?.['eventlistener'] !== undefined ||
    pod.metadata?.labels?.['app.kubernetes.io/part-of'] === 'Triggers'
  )
}

export async function deletePod(pod: V1Pod, d: OtomiDebugger, parsedArgs: any): Promise<void> {
  if (!pod.metadata?.name || !pod.metadata?.namespace) return

  if (!parsedArgs?.dryRun && !parsedArgs?.local) {
    d.info(`Deleting pod ${pod.metadata.namespace}/${pod.metadata.name} to refresh Istio sidecar`)
    const coreApi = k8s.core()
    await coreApi.deleteNamespacedPod({
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
    })
    d.info(`Successfully deleted pod ${pod.metadata.name}`)
  } else {
    d.info(`Dry run mode - would delete pod ${pod.metadata.namespace}/${pod.metadata.name}`)
  }
}

export async function restartPodOwner(pod: V1Pod, d: OtomiDebugger, parsedArgs: any): Promise<void> {
  if (!pod.metadata?.namespace) return

  // Handle pods without owner references (standalone pods)
  if (!pod.metadata?.ownerReferences || pod.metadata.ownerReferences.length === 0) {
    d.warn(
      `Pod ${pod.metadata.namespace}/${pod.metadata.name} has no owner references (standalone pod). Cannot automatically restart - manual intervention required to update Istio sidecar.`,
    )
    return
  }

  // For Tekton-managed pods, delete the pod instead of restarting the deployment
  if (isPodManagedByTekton(pod)) {
    await deletePod(pod, d, parsedArgs)
    return
  }

  for (const ownerRef of pod.metadata.ownerReferences) {
    if (!ownerRef.name) continue

    try {
      switch (ownerRef.kind) {
        case 'StatefulSet':
          await restartStatefulSet(ownerRef, pod.metadata.namespace, parsedArgs, d)
          break
        case 'Cluster':
          await restartCluster(ownerRef, pod.metadata.namespace, parsedArgs, d)
          break
        case 'ReplicaSet':
          await restartDeployment(ownerRef, pod.metadata.namespace, parsedArgs, d)
          break
      }
    } catch (error) {
      d.warn(`Could not restart ${ownerRef.kind} for pod ${pod.metadata.namespace}/${pod.metadata.name}:`, error)
    }
  }
}
