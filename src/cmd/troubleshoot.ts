import { ApiException } from '@kubernetes/client-node'
import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { k8s } from 'src/common/k8s'
import { getFilename } from 'src/common/utils'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)

interface ResourceReport {
  kind: string
  name: string
  namespace: string
  value: string
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
      const namespace = pod.metadata?.namespace || 'default'
      const podName = pod.metadata?.name || 'unknown'
      const issues: string[] = []

      // Check for CrashLoopBackOff and other problematic states
      if (['CrashLoopBackOff', 'Failed', 'Unknown'].includes(pod.status?.phase || '')) {
        issues.push(`Pod status: ${pod.status?.phase}. ${pod.status?.message || ''}`)
      }

      // Check for pending pods without node assignment
      if (pod.status?.phase === 'Pending' && !pod.spec?.nodeName) {
        const events = await coreApi.listNamespacedEvent({ namespace })
        const schedulingEvent = events.items.find(
          (event) => event.involvedObject.name === podName && event.reason === 'FailedScheduling',
        )
        if (schedulingEvent?.message) {
          issues.push(schedulingEvent.message)
        } else {
          issues.push('Pod is pending without node assignment')
        }
      }

      // Check container statuses
      pod.status?.containerStatuses?.forEach((containerStatus) => {
        if (containerStatus.lastState?.terminated?.reason === 'OOMKilled') {
          issues.push(
            `Container ${containerStatus.name} terminated (${containerStatus.lastState?.terminated?.reason}).`,
          )
        }
        if (containerStatus.state?.terminated) {
          issues.push(
            `Container ${containerStatus.name} terminated (${containerStatus.state?.terminated.reason}). ${containerStatus.state?.terminated.message || ''}`,
          )
        }
        if (containerStatus.state?.waiting?.reason) {
          issues.push(
            `Container ${containerStatus.name} waiting (${containerStatus.state?.waiting?.reason}). ${containerStatus.state?.waiting?.message || ''}`,
          )
        }
      })

      issues.forEach((issue) => {
        pods.push({
          kind: 'Pod',
          name: podName,
          namespace,
          value: issue,
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

  return response.items
    .filter((deployment) => deployment.status?.replicas !== deployment.status?.availableReplicas)
    .map((deployment) => ({
      kind: 'Deployment',
      name: deployment.metadata?.name || 'unknown',
      namespace: deployment.metadata?.namespace || 'default',
      value: `Desired ${deployment.status?.replicas}, Available ${deployment.status?.availableReplicas}`,
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
      response.items.forEach((sts) => {
        const replicas = sts.spec?.replicas || 0
        const readyReplicas = sts.status?.readyReplicas || 0
        if (readyReplicas < replicas) {
          statefulSets.push({
            kind: 'StatefulSet',
            name: sts.metadata?.name || 'unknown',
            namespace,
            value: `Desired ${replicas}, Ready ${readyReplicas}`,
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

  return response.items
    .filter((node) => node.status?.conditions?.some((cond) => cond.type === 'Ready' && cond.status !== 'True'))
    .map((node) => ({
      kind: 'Node',
      name: node.metadata?.name || 'unknown',
      namespace: 'N/A',
      value: 'Node not Ready',
    }))
}

/**
 * Get services with issues (e.g., LoadBalancer without IP)
 */
async function getServicesWithIssues(): Promise<ResourceReport[]> {
  const coreApi = k8s.core()
  const response = await coreApi.listServiceForAllNamespaces()

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
      response.items.forEach((pvc) => {
        if (pvc.status?.phase !== 'Bound') {
          const conditions = pvc.status?.conditions?.map((c) => `${c.type}: ${c.message}`).join('; ') || ''
          pvcs.push({
            kind: 'PersistentVolumeClaim',
            name: pvc.metadata?.name || 'unknown',
            namespace,
            value: `Phase: ${pvc.status?.phase}${conditions ? `. ${conditions}` : ''}`,
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

  return response.items
    .filter((pv) => pv.status?.phase !== 'Available' && pv.status?.phase !== 'Bound')
    .map((pv) => ({
      kind: 'PersistentVolume',
      name: pv.metadata?.name || 'unknown',
      namespace: 'N/A',
      value: `Phase: ${pv.status?.phase}`,
    }))
}

/**
 * Write troubleshooting report to ConfigMap
 */
async function writeReportToConfigMap(
  name: string,
  namespace: string,
  report: { timestamp: string; failedResources: ResourceReport[]; summary: any },
): Promise<void> {
  const coreApi = k8s.core()
  const reportJson = JSON.stringify(report, null, 2)

  try {
    // Try to read existing ConfigMap
    const existingConfigMap = await coreApi.readNamespacedConfigMap({ name, namespace })

    // Update existing ConfigMap
    if (!existingConfigMap.data) {
      existingConfigMap.data = {}
    }
    existingConfigMap.data.report = reportJson

    await coreApi.replaceNamespacedConfigMap({ name, namespace, body: existingConfigMap })
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      // ConfigMap doesn't exist, create it
      await coreApi.createNamespacedConfigMap({
        namespace,
        body: {
          metadata: { name },
          data: { report: reportJson },
        },
      })
    } else {
      throw error
    }
  }
}

/**
 * Main troubleshoot function
 */
export async function troubleshoot(): Promise<void> {
  const d = terminal(`cmd:${cmdName}:troubleshoot`)

  try {
    d.info('Starting troubleshooting scan...')

    // Gather all failed resources
    const [pods, deployments, statefulSets, nodes, services, pvcs, pvs] = await Promise.all([
      getPodsWithIssues(),
      getDeploymentsWithIssues(),
      getStatefulSetsWithIssues(),
      getNodesWithIssues(),
      getServicesWithIssues(),
      getPVCsWithIssues(),
      getPVsWithIssues(),
    ])

    const failedResources = [...pods, ...deployments, ...statefulSets, ...nodes, ...services, ...pvcs, ...pvs]

    // Generate report
    const report = {
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
    }

    // Store in ConfigMap
    const configMapName = 'apl-troubleshooting-report'
    const targetNamespace = 'apl-operator'

    if (failedResources.length === 0) {
      d.info('Your APL instance seems to be healthy.')
    } else {
      await writeReportToConfigMap(configMapName, targetNamespace, report)
      d.info(
        `Troubleshooting report stored in ConfigMap ${targetNamespace}/${configMapName} (${failedResources.length} failed resources)`,
      )
    }
  } catch (error) {
    d.error('Troubleshooting scan failed:', error)
    throw error
  }
}

export const module = {
  command: cmdName,
  describe: 'Generate troubleshooting report of failed resources and store in ConfigMap',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipEnvDirCheck: true, skipDecrypt: true })
    await troubleshoot()
  },
}
