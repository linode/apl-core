import { ApiException, CoreV1Event, V1ContainerStatus, V1Pod } from '@kubernetes/client-node'
import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { createUpdateConfigMap, k8s } from 'src/common/k8s'
import { getFilename } from 'src/common/utils'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { getErrorMessage } from 'src/operator/utils'
import { env } from 'src/common/envalid'

const cmdName = getFilename(__filename)
const { COLLECTION_INTERVAL_SECONDS, COLLECTION_DURATION_SECONDS } = env
const COLLECTION_INTERVAL_MS = COLLECTION_INTERVAL_SECONDS * 1000
const COLLECTION_DURATION_MS = COLLECTION_DURATION_SECONDS * 1000
interface ResourceReport {
  kind: string
  name: string
  namespace: string
  value: string
  timestamp: string // When this event was captured
}

interface TraceReport {
  timestamp: string
  failedResources: ResourceReport[]
  summary: {
    total: number
    byType: Record<string, number>
  }
  errors?: string[]
}

export function findRelevantPodEvent(events: CoreV1Event[], podName: string): CoreV1Event | undefined {
  const relevantReasons = ['FailedScheduling', 'FailedMount', 'FailedAttachVolume', 'FailedCreatePodSandBox']
  return events.find((event) => event.involvedObject?.name === podName && relevantReasons.includes(event.reason || ''))
}

export function checkPodPhaseIssues(pod: V1Pod, relevantEvent?: CoreV1Event): string[] {
  const issues: string[] = []
  const phase = pod.status?.phase

  // Check for problematic states
  if (['CrashLoopBackOff', 'Failed', 'Unknown'].includes(phase || '')) {
    issues.push(`Pod status: ${phase}. ${pod.status?.message || ''}`)
  }

  // Check for pending state
  if (phase === 'Pending') {
    if (relevantEvent?.message) {
      issues.push(`Pod pending: ${relevantEvent.message}`)
    } else if (!pod.spec?.nodeName) {
      issues.push('Pod is pending without node assignment')
    } else {
      issues.push('Pod is pending')
    }
  }

  return issues
}

export function checkContainerStatusIssues(containerStatuses?: V1ContainerStatus[]): string[] {
  const issues: string[] = []

  if (!containerStatuses) {
    return issues
  }

  containerStatuses.forEach((containerStatus) => {
    const containerName = containerStatus.name || 'unknown'

    // Check for OOMKilled
    if (containerStatus.lastState?.terminated?.reason === 'OOMKilled') {
      issues.push(`Container ${containerName} terminated (${containerStatus.lastState.terminated.reason}).`)
    }

    // Check for terminated state
    if (containerStatus.state?.terminated) {
      const reason = containerStatus.state.terminated.reason || 'Unknown'
      const message = containerStatus.state.terminated.message || ''
      issues.push(`Container ${containerName} terminated (${reason}). ${message}`)
    }

    // Check for waiting state
    if (containerStatus.state?.waiting?.reason) {
      const { reason } = containerStatus.state.waiting
      const message = containerStatus.state.waiting.message || ''
      issues.push(`Container ${containerName} waiting (${reason}). ${message}`)
    }
  })

  return issues
}

/**
 * Get pods with issues across all namespaces
 */
async function getPodsWithIssues(): Promise<ResourceReport[]> {
  const coreApi = k8s.core()
  const response = await coreApi.listPodForAllNamespaces()
  const pods: ResourceReport[] = []

  await Promise.all(
    response.items.map(async (pod) => {
      const namespace = pod.metadata?.namespace || 'unknown'
      const podName = pod.metadata?.name || 'unknown'
      const issues: string[] = []

      // Check for pending pods and fetch events if needed
      let relevantEvent: CoreV1Event | undefined
      if (pod.status?.phase === 'Pending') {
        const events = await coreApi.listNamespacedEvent({ namespace })
        relevantEvent = findRelevantPodEvent(events.items, podName)
      }

      // Collect all issues using helper functions
      issues.push(...checkPodPhaseIssues(pod, relevantEvent))
      issues.push(...checkContainerStatusIssues(pod.status?.containerStatuses))

      // Add each issue as a separate resource report
      issues.forEach((issue) => {
        pods.push({
          kind: 'Pod',
          name: podName,
          namespace,
          value: issue,
          timestamp: new Date().toISOString(),
        })
      })
    }),
  )

  return pods
}

/**
 * Get deployments with replica mismatches
 */
async function getDeploymentsWithIssues(): Promise<ResourceReport[]> {
  const appsApi = k8s.app()
  const response = await appsApi.listDeploymentForAllNamespaces()
  const timestamp = new Date().toISOString()

  return response.items
    .filter((deployment) => deployment.status?.replicas !== deployment.status?.availableReplicas)
    .map((deployment) => ({
      kind: 'Deployment',
      name: deployment.metadata?.name || 'unknown',
      namespace: deployment.metadata?.namespace || 'default',
      value: `Desired ${deployment.status?.replicas}, Available ${deployment.status?.availableReplicas}`,
      timestamp,
    }))
}

/**
 * Get statefulsets with replica mismatches
 */
async function getStatefulSetsWithIssues(): Promise<ResourceReport[]> {
  const appsApi = k8s.app()
  const coreApi = k8s.core()
  const namespaces = await coreApi.listNamespace()
  const statefulSets: ResourceReport[] = []

  await Promise.all(
    namespaces.items.map(async (ns) => {
      const namespace = ns.metadata?.name
      if (!namespace) return

      const response = await appsApi.listNamespacedStatefulSet({ namespace })
      const timestamp = new Date().toISOString()
      response.items.forEach((sts) => {
        const replicas = sts.spec?.replicas || 0
        const readyReplicas = sts.status?.readyReplicas || 0
        if (readyReplicas < replicas) {
          statefulSets.push({
            kind: 'StatefulSet',
            name: sts.metadata?.name || 'unknown',
            namespace,
            value: `Desired ${replicas}, Ready ${readyReplicas}`,
            timestamp,
          })
        }
      })
    }),
  )

  return statefulSets
}

/**
 * Get nodes that are not ready
 */
async function getNodesWithIssues(): Promise<ResourceReport[]> {
  const coreApi = k8s.core()
  const response = await coreApi.listNode()
  const timestamp = new Date().toISOString()

  return response.items
    .filter((node) => node.status?.conditions?.some((cond) => cond.type === 'Ready' && cond.status !== 'True'))
    .map((node) => ({
      kind: 'Node',
      name: node.metadata?.name || 'unknown',
      namespace: 'N/A',
      value: 'Node not Ready',
      timestamp,
    }))
}

/**
 * Get services with issues (e.g., LoadBalancer without IP)
 */
async function getServicesWithIssues(): Promise<ResourceReport[]> {
  const coreApi = k8s.core()
  const response = await coreApi.listServiceForAllNamespaces()
  const timestamp = new Date().toISOString()

  return response.items
    .map((service) => {
      const namespace = service.metadata?.namespace || 'default'
      const name = service.metadata?.name || 'unknown'
      const type = service.spec?.type || 'ClusterIP'
      let issue: string | null = null

      if (type === 'LoadBalancer' && !service.status?.loadBalancer?.ingress) {
        issue = 'LoadBalancer IP not assigned'
      }

      if (issue) {
        return {
          kind: 'Service',
          name,
          namespace,
          value: issue,
          timestamp,
        }
      }
      return null
    })
    .filter((r): r is ResourceReport => r !== null)
}

/**
 * Get PersistentVolumeClaims that are not bound
 */
async function getPVCsWithIssues(): Promise<ResourceReport[]> {
  const coreApi = k8s.core()
  const namespaces = await coreApi.listNamespace()
  const pvcs: ResourceReport[] = []

  await Promise.all(
    namespaces.items.map(async (ns) => {
      const namespace = ns.metadata?.name
      if (!namespace) return

      const response = await coreApi.listNamespacedPersistentVolumeClaim({ namespace })
      const timestamp = new Date().toISOString()
      response.items.forEach((pvc) => {
        if (pvc.status?.phase !== 'Bound') {
          const conditions = pvc.status?.conditions?.map((c) => `${c.type}: ${c.message}`).join('; ') || ''
          pvcs.push({
            kind: 'PersistentVolumeClaim',
            name: pvc.metadata?.name || 'unknown',
            namespace,
            value: `Phase: ${pvc.status?.phase}${conditions ? `. ${conditions}` : ''}`,
            timestamp,
          })
        }
      })
    }),
  )

  return pvcs
}

/**
 * Get PersistentVolumes with issues
 */
async function getPVsWithIssues(): Promise<ResourceReport[]> {
  const coreApi = k8s.core()
  const response = await coreApi.listPersistentVolume()
  const timestamp = new Date().toISOString()

  return response.items
    .filter((pv) => pv.status?.phase !== 'Available' && pv.status?.phase !== 'Bound')
    .map((pv) => ({
      kind: 'PersistentVolume',
      name: pv.metadata?.name || 'unknown',
      namespace: 'N/A',
      value: `Phase: ${pv.status?.phase}`,
      timestamp,
    }))
}

/**
 * Get ArgoCD Applications with health or sync issues
 */
async function getArgoApplicationsWithIssues(): Promise<ResourceReport[]> {
  const customApi = k8s.custom()
  const applications: ResourceReport[] = []

  const response = await customApi.listClusterCustomObject({
    group: 'argoproj.io',
    version: 'v1alpha1',
    plural: 'applications',
  })

  const items = (response as any).items || []
  const timestamp = new Date().toISOString()

  items.forEach((app: any) => {
    const name = app.metadata?.name || 'unknown'
    const namespace = app.metadata?.namespace || 'unknown'
    const healthStatus = app.status?.health?.status
    const syncStatus = app.status?.sync?.status
    const issues: string[] = []

    if (healthStatus && healthStatus !== 'Healthy') {
      const healthMessage = app.status?.health?.message || 'Unknown'
      issues.push(`HealthStatus: ${healthStatus} message: ${healthMessage}`)
    }

    if (syncStatus && syncStatus !== 'Synced') {
      issues.push(`SyncStatus: ${syncStatus}`)
    }

    const operationPhase = app.status?.operationState?.phase
    if (operationPhase && operationPhase !== 'Succeeded') {
      const message = app.status?.operationState?.message || 'Unknown'
      issues.push(`Operation: ${operationPhase} - ${message}`)
    }

    issues.forEach((issue) => {
      applications.push({
        kind: 'Application',
        name,
        namespace,
        value: issue,
        timestamp,
      })
    })
  })

  return applications
}

/**
 * Write trace report to ConfigMap
 */
async function writeReportToConfigMap(name: string, namespace: string, report: TraceReport): Promise<void> {
  const coreApi = k8s.core()
  const reportJson = JSON.stringify(report, null, 2)
  // ConfigMap keys must match [-._a-zA-Z0-9]+, so replace colons with dots
  const reportKey = `report-${report.timestamp.replace(/:/g, '.')}`

  await createUpdateConfigMap(coreApi, name, namespace, { [reportKey]: reportJson })
}

/**
 * Main collect traces function
 */
export async function collectTraces(): Promise<void> {
  const d = terminal(`cmd:${cmdName}:collectTraces`)

  try {
    d.info('Collecting traces from cluster resources...')

    // Gather all failed resources using allSettled to continue on individual failures
    const results = await Promise.allSettled([
      getPodsWithIssues(),
      getDeploymentsWithIssues(),
      getStatefulSetsWithIssues(),
      getNodesWithIssues(),
      getServicesWithIssues(),
      getPVCsWithIssues(),
      getPVsWithIssues(),
      getArgoApplicationsWithIssues(),
    ])

    // Process results and collect both resources and errors
    const failedResources: ResourceReport[] = []
    const collectionErrors: string[] = []

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        failedResources.push(...result.value)
      } else {
        const error = result.reason
        const errorMessage = error instanceof Error ? error.message : String(error)

        // Log based on error type
        if (error instanceof ApiException && (error.code === 404 || error.code === 403)) {
          d.info(`Resource collection skipped (expected if not installed): ${errorMessage}`)
        } else {
          d.warn(`Failed to collect resources: ${errorMessage}`)
        }

        collectionErrors.push(errorMessage)
      }
    })

    // Generate report
    const report: TraceReport = {
      timestamp: new Date().toISOString(),
      failedResources,
      summary: {
        total: failedResources.length,
        byType: failedResources.reduce(
          (acc, r) => ({
            ...acc,
            [r.kind]: (acc[r.kind] || 0) + 1,
          }),
          {} as Record<string, number>,
        ),
      },
      ...(collectionErrors.length > 0 && { errors: collectionErrors }),
    }

    // Store in ConfigMap
    const configMapName = 'apl-traces-report'
    const targetNamespace = 'apl-operator'

    if (failedResources.length === 0) {
      d.info('No failing resources found. Your APL instance seems to be healthy.')
    }

    // Always write the report to ConfigMap (even when healthy, for timestamp visibility)
    await writeReportToConfigMap(configMapName, targetNamespace, report)
    d.info(`Trace report stored in ConfigMap ${targetNamespace}/${configMapName} (${failedResources.length} issues)`)
  } catch (error) {
    d.error('Failed to collect traces:', error)
    throw error
  }
}

async function getCollectionStartTime(name: string, namespace: string): Promise<number> {
  const coreApi = k8s.core()

  try {
    const configMap = await coreApi.readNamespacedConfigMap({ name, namespace })
    // Use ConfigMap's creation timestamp as the start time
    if (configMap.metadata?.creationTimestamp) {
      return new Date(configMap.metadata.creationTimestamp).getTime()
    }
  } catch {
    // ConfigMap doesn't exist yet, will be created by first collectTraces() call
  }

  // No ConfigMap yet, use current time (ConfigMap will be created by collectTraces)
  return Date.now()
}

export async function runTraceCollectionLoop(): Promise<void> {
  const d = terminal('cmd:traces:runTraceCollectionLoop')
  const configMapName = 'apl-traces-report'
  const namespace = 'apl-operator'

  // Get collection start time from ConfigMap creation timestamp
  const startTime = await getCollectionStartTime(configMapName, namespace)
  const endTime = startTime + COLLECTION_DURATION_MS
  const now = Date.now()

  if (now >= endTime) {
    d.info('Trace collection window (30 minutes) already elapsed, skipping')
    return
  }

  const remainingMs = endTime - now
  d.info(`Starting trace collection loop (${Math.round(remainingMs / 60000)} minutes remaining)`)

  while (Date.now() < endTime) {
    try {
      d.info('Running periodic trace collection')
      await collectTraces()
    } catch (error) {
      d.warn('Failed to collect traces:', getErrorMessage(error))
    }

    const remainingTime = endTime - Date.now()
    if (remainingTime > 0) {
      const waitTime = Math.min(COLLECTION_INTERVAL_MS, remainingTime)
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  d.info('Trace collection loop completed')
}

export const module = {
  command: 'traces',
  describe: 'Collect traces of failed resources and store report in ConfigMap',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipEnvDirCheck: true, skipDecrypt: true })
    await collectTraces()
  },
}
