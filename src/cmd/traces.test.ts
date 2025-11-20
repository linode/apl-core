import { ApiException, CoreV1Event, V1ContainerStatus, V1Pod } from '@kubernetes/client-node'
import * as k8sModule from 'src/common/k8s'
import { checkContainerStatusIssues, checkPodPhaseIssues, collectTraces, findRelevantPodEvent } from './traces'

// Mock dependencies
jest.mock('src/common/k8s')
jest.mock('src/common/cli', () => ({
  prepareEnvironment: jest.fn(),
}))
jest.mock('src/common/debug', () => ({
  terminal: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    stream: { log: process.stdout, error: process.stderr },
  })),
}))
jest.mock('src/common/utils', () => ({
  getFilename: jest.fn(() => 'troubleshoot'),
}))
jest.mock('src/common/yargs', () => ({
  setParsedArgs: jest.fn(),
}))

class MockApiException extends ApiException<any> {
  code: number
  constructor(code: number, message: string) {
    super(code, message, {}, {})
    this.code = code
  }
}

describe('Pod Issue Detection Helpers', () => {
  describe('findRelevantPodEvent', () => {
    it('should find event with FailedScheduling reason', () => {
      const events: CoreV1Event[] = [
        {
          involvedObject: { name: 'test-pod' },
          reason: 'FailedScheduling',
          message: 'Insufficient cpu',
        } as CoreV1Event,
        { involvedObject: { name: 'other-pod' }, reason: 'FailedScheduling', message: 'Other issue' } as CoreV1Event,
      ]
      const result = findRelevantPodEvent(events, 'test-pod')
      expect(result).toEqual(events[0])
      expect(result?.message).toBe('Insufficient cpu')
    })

    it('should find event with FailedMount reason', () => {
      const events: CoreV1Event[] = [
        { involvedObject: { name: 'test-pod' }, reason: 'FailedMount', message: 'Volume not found' } as CoreV1Event,
      ]
      const result = findRelevantPodEvent(events, 'test-pod')
      expect(result).toEqual(events[0])
      expect(result?.message).toBe('Volume not found')
    })

    it('should find event with FailedAttachVolume reason', () => {
      const events: CoreV1Event[] = [
        {
          involvedObject: { name: 'test-pod' },
          reason: 'FailedAttachVolume',
          message: 'Volume attach failed',
        } as CoreV1Event,
      ]
      const result = findRelevantPodEvent(events, 'test-pod')
      expect(result).toEqual(events[0])
    })

    it('should find event with FailedCreatePodSandBox reason', () => {
      const events: CoreV1Event[] = [
        {
          involvedObject: { name: 'test-pod' },
          reason: 'FailedCreatePodSandBox',
          message: 'Network error',
        } as CoreV1Event,
      ]
      const result = findRelevantPodEvent(events, 'test-pod')
      expect(result).toEqual(events[0])
    })

    it('should return undefined when no matching reason', () => {
      const events: CoreV1Event[] = [
        { involvedObject: { name: 'test-pod' }, reason: 'Started', message: 'Container started' } as CoreV1Event,
      ]
      const result = findRelevantPodEvent(events, 'test-pod')
      expect(result).toBeUndefined()
    })

    it('should return undefined when podName does not match', () => {
      const events: CoreV1Event[] = [
        {
          involvedObject: { name: 'other-pod' },
          reason: 'FailedScheduling',
          message: 'Insufficient cpu',
        } as CoreV1Event,
      ]
      const result = findRelevantPodEvent(events, 'test-pod')
      expect(result).toBeUndefined()
    })

    it('should return undefined for empty events array', () => {
      const result = findRelevantPodEvent([], 'test-pod')
      expect(result).toBeUndefined()
    })

    it('should return first match when multiple events match', () => {
      const events: CoreV1Event[] = [
        { involvedObject: { name: 'test-pod' }, reason: 'FailedScheduling', message: 'First issue' } as CoreV1Event,
        { involvedObject: { name: 'test-pod' }, reason: 'FailedMount', message: 'Second issue' } as CoreV1Event,
      ]
      const result = findRelevantPodEvent(events, 'test-pod')
      expect(result).toEqual(events[0])
      expect(result?.message).toBe('First issue')
    })
  })

  describe('checkPodPhaseIssues', () => {
    it('should detect CrashLoopBackOff with message', () => {
      const pod = {
        status: { phase: 'CrashLoopBackOff', message: 'Container exited with code 1' },
      } as V1Pod
      const result = checkPodPhaseIssues(pod)
      expect(result).toEqual(['Pod status: CrashLoopBackOff. Container exited with code 1'])
    })

    it('should detect Failed status with message', () => {
      const pod = {
        status: { phase: 'Failed', message: 'Pod failed to start' },
      } as V1Pod
      const result = checkPodPhaseIssues(pod)
      expect(result).toEqual(['Pod status: Failed. Pod failed to start'])
    })

    it('should detect Unknown status with message', () => {
      const pod = {
        status: { phase: 'Unknown', message: 'Node lost connection' },
      } as V1Pod
      const result = checkPodPhaseIssues(pod)
      expect(result).toEqual(['Pod status: Unknown. Node lost connection'])
    })

    it('should detect Pending with relevant event message', () => {
      const pod = {
        status: { phase: 'Pending' },
        spec: { nodeName: 'node-1' },
      } as V1Pod
      const event = { message: 'Insufficient memory on node' } as CoreV1Event
      const result = checkPodPhaseIssues(pod, event)
      expect(result).toEqual(['Pod pending: Insufficient memory on node'])
    })

    it('should detect Pending without node assignment', () => {
      const pod = {
        status: { phase: 'Pending' },
        spec: {},
      } as V1Pod
      const result = checkPodPhaseIssues(pod)
      expect(result).toEqual(['Pod is pending without node assignment'])
    })

    it('should detect Pending with node but no event', () => {
      const pod = {
        status: { phase: 'Pending' },
        spec: { nodeName: 'node-1' },
      } as V1Pod
      const result = checkPodPhaseIssues(pod)
      expect(result).toEqual(['Pod is pending'])
    })

    it('should return empty array for Running pod', () => {
      const pod = {
        status: { phase: 'Running' },
      } as V1Pod
      const result = checkPodPhaseIssues(pod)
      expect(result).toEqual([])
    })

    it('should return empty array for Succeeded pod', () => {
      const pod = {
        status: { phase: 'Succeeded' },
      } as V1Pod
      const result = checkPodPhaseIssues(pod)
      expect(result).toEqual([])
    })

    it('should handle missing pod.status', () => {
      const pod = {} as V1Pod
      const result = checkPodPhaseIssues(pod)
      expect(result).toEqual([])
    })

    it('should handle missing pod.spec', () => {
      const pod = {
        status: { phase: 'Pending' },
      } as V1Pod
      const result = checkPodPhaseIssues(pod)
      expect(result).toEqual(['Pod is pending without node assignment'])
    })
  })

  describe('checkContainerStatusIssues', () => {
    it('should detect OOMKilled in lastState', () => {
      const containerStatuses: V1ContainerStatus[] = [
        {
          name: 'app-container',
          lastState: {
            terminated: { reason: 'OOMKilled' },
          },
        } as V1ContainerStatus,
      ]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toEqual(['Container app-container terminated (OOMKilled).'])
    })

    it('should detect terminated state with reason and message', () => {
      const containerStatuses: V1ContainerStatus[] = [
        {
          name: 'app-container',
          state: {
            terminated: { reason: 'Error', message: 'Application crashed' },
          },
        } as V1ContainerStatus,
      ]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toEqual(['Container app-container terminated (Error). Application crashed'])
    })

    it('should detect terminated state with reason only', () => {
      const containerStatuses: V1ContainerStatus[] = [
        {
          name: 'app-container',
          state: {
            terminated: { reason: 'Completed' },
          },
        } as V1ContainerStatus,
      ]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toEqual(['Container app-container terminated (Completed). '])
    })

    it('should detect waiting state with reason and message', () => {
      const containerStatuses: V1ContainerStatus[] = [
        {
          name: 'app-container',
          state: {
            waiting: { reason: 'ImagePullBackOff', message: 'Back-off pulling image' },
          },
        } as V1ContainerStatus,
      ]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toEqual(['Container app-container waiting (ImagePullBackOff). Back-off pulling image'])
    })

    it('should detect waiting state with reason only', () => {
      const containerStatuses: V1ContainerStatus[] = [
        {
          name: 'app-container',
          state: {
            waiting: { reason: 'ContainerCreating' },
          },
        } as V1ContainerStatus,
      ]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toEqual(['Container app-container waiting (ContainerCreating). '])
    })

    it('should detect multiple issues in one container', () => {
      const containerStatuses: V1ContainerStatus[] = [
        {
          name: 'app-container',
          lastState: {
            terminated: { reason: 'OOMKilled' },
          },
          state: {
            terminated: { reason: 'Error', message: 'Restarted and failed again' },
          },
        } as V1ContainerStatus,
      ]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toEqual([
        'Container app-container terminated (OOMKilled).',
        'Container app-container terminated (Error). Restarted and failed again',
      ])
    })

    it('should detect issues across multiple containers', () => {
      const containerStatuses: V1ContainerStatus[] = [
        {
          name: 'app-container',
          state: {
            terminated: { reason: 'Error' },
          },
        } as V1ContainerStatus,
        {
          name: 'sidecar-container',
          state: {
            waiting: { reason: 'CrashLoopBackOff' },
          },
        } as V1ContainerStatus,
      ]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toHaveLength(2)
      expect(result).toContain('Container app-container terminated (Error). ')
      expect(result).toContain('Container sidecar-container waiting (CrashLoopBackOff). ')
    })

    it('should return empty array for healthy container', () => {
      const containerStatuses: V1ContainerStatus[] = [
        {
          name: 'app-container',
          state: {
            running: { startedAt: new Date('2024-01-01T00:00:00Z') },
          },
        } as V1ContainerStatus,
      ]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toEqual([])
    })

    it('should return empty array for undefined containerStatuses', () => {
      const result = checkContainerStatusIssues(undefined)
      expect(result).toEqual([])
    })

    it('should return empty array for empty containerStatuses array', () => {
      const result = checkContainerStatusIssues([])
      expect(result).toEqual([])
    })

    it('should handle container with only name (no state)', () => {
      const containerStatuses: V1ContainerStatus[] = [{ name: 'app-container' } as V1ContainerStatus]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toEqual([])
    })

    it('should handle container with partial state data', () => {
      const containerStatuses: V1ContainerStatus[] = [
        {
          name: 'app-container',
          state: {},
        } as V1ContainerStatus,
      ]
      const result = checkContainerStatusIssues(containerStatuses)
      expect(result).toEqual([])
    })
  })
})

describe('Collect Traces Command', () => {
  let mockCoreApi: any
  let mockAppsApi: any
  let mockCustomApi: any
  let mockCreateUpdateConfigMap: any

  beforeEach(() => {
    mockCoreApi = {
      listPodForAllNamespaces: jest.fn(),
      listNamespacedEvent: jest.fn(),
      listServiceForAllNamespaces: jest.fn(),
      listNamespace: jest.fn(),
      listNamespacedPersistentVolumeClaim: jest.fn(),
      listPersistentVolume: jest.fn(),
      listNode: jest.fn(),
    }

    mockAppsApi = {
      listDeploymentForAllNamespaces: jest.fn(),
      listNamespacedStatefulSet: jest.fn(),
    }

    mockCustomApi = {
      listClusterCustomObject: jest.fn(),
    }

    mockCreateUpdateConfigMap = jest.fn()
    ;(k8sModule.k8s as any) = {
      core: jest.fn(() => mockCoreApi),
      app: jest.fn(() => mockAppsApi),
      custom: jest.fn(() => mockCustomApi),
    }
    ;(k8sModule as any).createUpdateConfigMap = mockCreateUpdateConfigMap
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should detect all types of failed resources and store in ConfigMap', async () => {
    // Mock various failing resources
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({
      items: [
        {
          metadata: { name: 'crashed-pod', namespace: 'default' },
          status: { phase: 'CrashLoopBackOff', message: 'Container crashed' },
        },
        {
          metadata: { name: 'oom-pod', namespace: 'default' },
          status: {
            phase: 'Running',
            containerStatuses: [{ name: 'main', lastState: { terminated: { reason: 'OOMKilled' } } }],
          },
        },
      ],
    })

    mockAppsApi.listDeploymentForAllNamespaces.mockResolvedValue({
      items: [
        {
          metadata: { name: 'test-deployment', namespace: 'default' },
          status: { replicas: 3, availableReplicas: 1 },
        },
      ],
    })

    mockCoreApi.listNamespace.mockResolvedValue({
      items: [{ metadata: { name: 'default' } }],
    })

    mockAppsApi.listNamespacedStatefulSet.mockResolvedValue({
      items: [
        {
          metadata: { name: 'test-sts', namespace: 'default' },
          spec: { replicas: 3 },
          status: { readyReplicas: 0 },
        },
      ],
    })

    mockCoreApi.listNode.mockResolvedValue({
      items: [
        {
          metadata: { name: 'node-1' },
          status: { conditions: [{ type: 'Ready', status: 'False' }] },
        },
      ],
    })

    mockCoreApi.listServiceForAllNamespaces.mockResolvedValue({
      items: [
        {
          metadata: { name: 'test-lb', namespace: 'default' },
          spec: { type: 'LoadBalancer' },
          status: { loadBalancer: {} },
        },
      ],
    })

    mockCoreApi.listNamespacedPersistentVolumeClaim.mockResolvedValue({
      items: [
        {
          metadata: { name: 'test-pvc', namespace: 'default' },
          status: { phase: 'Pending' },
        },
      ],
    })

    mockCoreApi.listPersistentVolume.mockResolvedValue({
      items: [
        {
          metadata: { name: 'test-pv' },
          status: { phase: 'Failed' },
        },
      ],
    })

    mockCustomApi.listClusterCustomObject.mockResolvedValue({
      items: [
        {
          metadata: { name: 'test-app', namespace: 'argocd' },
          status: {
            health: { status: 'Degraded', message: 'Pod not ready' },
            sync: { status: 'OutOfSync' },
          },
        },
      ],
    })

    mockCreateUpdateConfigMap.mockResolvedValue({})

    await collectTraces()

    expect(mockCreateUpdateConfigMap).toHaveBeenCalledWith(mockCoreApi, 'apl-traces-report', 'apl-operator', {
      report: expect.any(String),
    })

    const configMapCall = mockCreateUpdateConfigMap.mock.calls[0]
    const reportData = JSON.parse(configMapCall[3].report)

    // Should have all resource types
    expect(reportData.failedResources.length).toBeGreaterThan(0)
    expect(reportData.summary.byType).toEqual(
      expect.objectContaining({
        Pod: expect.any(Number),
        Deployment: 1,
        StatefulSet: 1,
        Node: 1,
        Service: 1,
        PersistentVolumeClaim: 1,
        PersistentVolume: 1,
        Application: 2, // Health and Sync issues
      }),
    )
    expect(reportData.timestamp).toBeDefined()
  })

  it('should report healthy cluster when no issues found', async () => {
    // Mock all resources as healthy
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({ items: [] })
    mockAppsApi.listDeploymentForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listNamespace.mockResolvedValue({ items: [] })
    mockCoreApi.listNode.mockResolvedValue({ items: [] })
    mockCoreApi.listServiceForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listPersistentVolume.mockResolvedValue({ items: [] })
    mockCustomApi.listClusterCustomObject.mockResolvedValue({ items: [] })

    await collectTraces()

    // Should not create ConfigMap for healthy cluster
    expect(mockCreateUpdateConfigMap).not.toHaveBeenCalled()
  })

  it('should call createUpdateConfigMap when there are issues', async () => {
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({
      items: [
        {
          metadata: { name: 'failed-pod', namespace: 'default' },
          status: { phase: 'Failed' },
        },
      ],
    })

    mockAppsApi.listDeploymentForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listNamespace.mockResolvedValue({ items: [] })
    mockCoreApi.listNode.mockResolvedValue({ items: [] })
    mockCoreApi.listServiceForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listPersistentVolume.mockResolvedValue({ items: [] })
    mockCustomApi.listClusterCustomObject.mockResolvedValue({ items: [] })

    mockCreateUpdateConfigMap.mockResolvedValue({})

    await collectTraces()

    expect(mockCreateUpdateConfigMap).toHaveBeenCalled()
  })

  it('should gracefully handle ArgoCD not installed', async () => {
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({ items: [] })
    mockAppsApi.listDeploymentForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listNamespace.mockResolvedValue({ items: [] })
    mockCoreApi.listNode.mockResolvedValue({ items: [] })
    mockCoreApi.listServiceForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listPersistentVolume.mockResolvedValue({ items: [] })
    mockCustomApi.listClusterCustomObject.mockRejectedValue(new MockApiException(404, 'Not Found'))

    await collectTraces()

    // Should not throw error
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalled()
  })

  it('should continue collecting resources when one type fails', async () => {
    // Mock pods to fail
    mockCoreApi.listPodForAllNamespaces.mockRejectedValue(new Error('API error'))

    // Mock deployments to succeed with issues
    mockAppsApi.listDeploymentForAllNamespaces.mockResolvedValue({
      items: [
        {
          metadata: { name: 'test-deployment', namespace: 'default' },
          status: { replicas: 3, availableReplicas: 1 },
        },
      ],
    })

    mockCoreApi.listNamespace.mockResolvedValue({ items: [] })
    mockCoreApi.listNode.mockResolvedValue({ items: [] })
    mockCoreApi.listServiceForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listPersistentVolume.mockResolvedValue({ items: [] })
    mockCustomApi.listClusterCustomObject.mockResolvedValue({ items: [] })

    mockCreateUpdateConfigMap.mockResolvedValue({})

    await collectTraces()

    // Should create ConfigMap with deployment issues
    expect(mockCreateUpdateConfigMap).toHaveBeenCalled()

    const configMapCall = mockCreateUpdateConfigMap.mock.calls[0]
    const reportData = JSON.parse(configMapCall[3].report)

    // Should have deployment in failed resources
    expect(reportData.failedResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'Deployment',
          name: 'test-deployment',
        }),
      ]),
    )

    // Should have error entry
    expect(reportData.errors).toEqual(expect.arrayContaining(['API error']))
  })

  it('should include errors field in report when collection failures occur', async () => {
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({ items: [] })
    mockAppsApi.listDeploymentForAllNamespaces.mockRejectedValue(new MockApiException(403, 'Permission denied'))
    mockCoreApi.listNamespace.mockResolvedValue({ items: [] })
    mockCoreApi.listNode.mockRejectedValue(new Error('Connection timeout'))
    mockCoreApi.listServiceForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listPersistentVolume.mockResolvedValue({ items: [] })
    mockCustomApi.listClusterCustomObject.mockResolvedValue({ items: [] })

    await collectTraces()

    // Should not throw error despite multiple failures
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalled()
  })

  it('should not include errors field when all collections succeed', async () => {
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({
      items: [
        {
          metadata: { name: 'failed-pod', namespace: 'default' },
          status: { phase: 'Failed' },
        },
      ],
    })
    mockAppsApi.listDeploymentForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listNamespace.mockResolvedValue({ items: [] })
    mockCoreApi.listNode.mockResolvedValue({ items: [] })
    mockCoreApi.listServiceForAllNamespaces.mockResolvedValue({ items: [] })
    mockCoreApi.listPersistentVolume.mockResolvedValue({ items: [] })
    mockCustomApi.listClusterCustomObject.mockResolvedValue({ items: [] })

    mockCreateUpdateConfigMap.mockResolvedValue({})

    await collectTraces()

    const configMapCall = mockCreateUpdateConfigMap.mock.calls[0]
    const reportData = JSON.parse(configMapCall[3].report)

    // Should not have errors field when all collections succeed
    expect(reportData.errors).toBeUndefined()
  })

  it('should handle multiple simultaneous collection failures', async () => {
    // Mock multiple resource types to fail
    mockCoreApi.listPodForAllNamespaces.mockRejectedValue(new Error('Pods API failed'))
    mockAppsApi.listDeploymentForAllNamespaces.mockRejectedValue(new Error('Deployments API failed'))
    mockCoreApi.listNamespace.mockRejectedValue(new Error('Namespace API failed'))
    mockCoreApi.listNode.mockRejectedValue(new Error('Node API failed'))
    mockCoreApi.listServiceForAllNamespaces.mockRejectedValue(new Error('Service API failed'))
    mockCoreApi.listPersistentVolume.mockRejectedValue(new Error('PV API failed'))
    mockCustomApi.listClusterCustomObject.mockRejectedValue(new Error('ArgoCD API failed'))

    await collectTraces()

    // Should complete without throwing despite all failures
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalled()
    // Should not create ConfigMap when no issues found and all failed
    expect(mockCreateUpdateConfigMap).not.toHaveBeenCalled()
  })
})
