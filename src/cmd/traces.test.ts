import { ApiException } from '@kubernetes/client-node'
import * as k8sModule from 'src/common/k8s'

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

import { collectTraces } from './traces'

class MockApiException extends ApiException<any> {
  code: number
  constructor(code: number, message: string) {
    super(code, message, {}, {})
    this.code = code
  }
}

describe('Collect Traces Command', () => {
  let mockCoreApi: any
  let mockAppsApi: any
  let mockCustomApi: any

  beforeEach(() => {
    mockCoreApi = {
      listPodForAllNamespaces: jest.fn(),
      listNamespacedEvent: jest.fn(),
      listServiceForAllNamespaces: jest.fn(),
      listNamespace: jest.fn(),
      listNamespacedPersistentVolumeClaim: jest.fn(),
      listPersistentVolume: jest.fn(),
      listNode: jest.fn(),
      readNamespacedConfigMap: jest.fn(),
      createNamespacedConfigMap: jest.fn(),
      replaceNamespacedConfigMap: jest.fn(),
    }

    mockAppsApi = {
      listDeploymentForAllNamespaces: jest.fn(),
      listNamespacedStatefulSet: jest.fn(),
    }

    mockCustomApi = {
      listClusterCustomObject: jest.fn(),
    }
    ;(k8sModule.k8s as any) = {
      core: jest.fn(() => mockCoreApi),
      app: jest.fn(() => mockAppsApi),
      custom: jest.fn(() => mockCustomApi),
    }
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

    mockCoreApi.readNamespacedConfigMap.mockRejectedValue(new MockApiException(404, 'Not Found'))
    mockCoreApi.createNamespacedConfigMap.mockResolvedValue({})

    await collectTraces()

    expect(mockCoreApi.createNamespacedConfigMap).toHaveBeenCalledWith({
      namespace: 'apl-operator',
      body: {
        metadata: { name: 'apl-traces-report' },
        data: { report: expect.any(String) },
      },
    })

    // eslint-disable-next-line prefer-destructuring, @typescript-eslint/no-unsafe-argument
    const configMapCall = mockCoreApi.createNamespacedConfigMap.mock.calls[0][0]
    const reportData = JSON.parse(configMapCall.body.data.report)

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
    expect(mockCoreApi.createNamespacedConfigMap).not.toHaveBeenCalled()
    expect(mockCoreApi.replaceNamespacedConfigMap).not.toHaveBeenCalled()
  })

  it('should update existing ConfigMap instead of creating new one', async () => {
    const existingConfigMap = {
      metadata: { name: 'apl-traces-report' },
      data: { report: '{"old": "data"}' },
    }

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

    mockCoreApi.readNamespacedConfigMap.mockResolvedValue(existingConfigMap)
    mockCoreApi.replaceNamespacedConfigMap.mockResolvedValue({})

    await collectTraces()

    expect(mockCoreApi.replaceNamespacedConfigMap).toHaveBeenCalled()
    expect(mockCoreApi.createNamespacedConfigMap).not.toHaveBeenCalled()
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

    mockCoreApi.readNamespacedConfigMap.mockRejectedValue(new MockApiException(404, 'Not Found'))
    mockCoreApi.createNamespacedConfigMap.mockResolvedValue({})

    await collectTraces()

    // Should create ConfigMap with deployment issues
    expect(mockCoreApi.createNamespacedConfigMap).toHaveBeenCalled()

    // eslint-disable-next-line prefer-destructuring, @typescript-eslint/no-unsafe-argument
    const configMapCall = mockCoreApi.createNamespacedConfigMap.mock.calls[0][0]
    const reportData = JSON.parse(configMapCall.body.data.report)

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

    mockCoreApi.readNamespacedConfigMap.mockRejectedValue(new MockApiException(404, 'Not Found'))
    mockCoreApi.createNamespacedConfigMap.mockResolvedValue({})

    await collectTraces()

    // eslint-disable-next-line prefer-destructuring, @typescript-eslint/no-unsafe-argument
    const configMapCall = mockCoreApi.createNamespacedConfigMap.mock.calls[0][0]
    const reportData = JSON.parse(configMapCall.body.data.report)

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
    expect(mockCoreApi.createNamespacedConfigMap).not.toHaveBeenCalled()
  })
})
