import {
  ApiException,
  AppsV1Api,
  CoreV1Api,
  CustomObjectsApi,
  PatchStrategy,
  setHeaderOptions,
  V1Pod,
  V1PodList,
  V1ResourceRequirements,
  V1Secret,
  V1StatefulSet,
} from '@kubernetes/client-node'
import * as k8s from './k8s'
import {
  appRevisionMatches,
  checkArgoCDAppStatus,
  deleteStatefulSetPods,
  patchArgoCdApp,
  patchContainerResourcesOfSts,
  patchStatefulSetResources,
} from './k8s'
import { terminal } from './debug'
import retry from 'async-retry'
import { env } from './envalid'
import { ARGOCD_APP_PARAMS } from './constants'

class MockApiException<T> extends ApiException<T> {
  code: number
  body: T
  headers: {
    [key: string]: string
  }

  constructor(
    code: number,
    message: string,
    body: T,
    headers: {
      [key: string]: string
    },
  ) {
    super(code, message, body, headers)
    this.code = code
    this.body = body
    this.headers = headers
    this.name = 'ApiException'
  }
}

jest.mock('@kubernetes/client-node')
jest.mock('async-retry')
jest.mock('./envalid')

const mockRetry = retry as jest.MockedFunction<typeof retry>
const mockEnv = {
  RETRIES: 3,
  RANDOM: true,
  MIN_TIMEOUT: 1000,
  FACTOR: 2,
}
;(env as any).RETRIES = mockEnv.RETRIES
;(env as any).RANDOM = mockEnv.RANDOM
;(env as any).MIN_TIMEOUT = mockEnv.MIN_TIMEOUT
;(env as any).FACTOR = mockEnv.FACTOR
describe('createGenericSecret', () => {
  const mockCoreV1Api = new CoreV1Api({} as any) as jest.Mocked<CoreV1Api>

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create a secret with base64-encoded data', async () => {
    const name = 'test-secret'
    const namespace = 'default'
    const secretData = {
      username: 'admin',
      password: 'password123',
    }
    const encodedData = {
      username: 'YWRtaW4=', // base64 of 'admin'
      password: 'cGFzc3dvcmQxMjM=', // base64 of 'password123'
    }

    const mockResponse = { metadata: { name, namespace }, data: encodedData } as any
    mockCoreV1Api.createNamespacedSecret.mockResolvedValue(mockResponse)
    const result = await k8s.createUpdateGenericSecret(mockCoreV1Api, name, namespace, secretData)

    expect(mockCoreV1Api.createNamespacedSecret).toHaveBeenCalledWith({
      body: {
        data: { password: 'cGFzc3dvcmQxMjM=', username: 'YWRtaW4=' },
        metadata: { name: 'test-secret', namespace: 'default' },
        type: 'Opaque',
      },
      namespace: 'default',
    })

    expect(result).toEqual(mockResponse)
  })

  it('should patch instead if the secret exists', async () => {
    const name = 'test-secret'
    const namespace = 'default'
    const secretData = {
      username: 'admin',
      password: 'password123',
    }
    const encodedData = {
      username: 'YWRtaW4=', // base64 of 'admin'
      password: 'cGFzc3dvcmQxMjM=', // base64 of 'password123'
    }

    const mockError = new MockApiException(409, 'Conflict', {}, {})
    mockCoreV1Api.createNamespacedSecret.mockRejectedValue(mockError)
    const mockResponse = { metadata: { name, namespace }, data: encodedData }
    mockCoreV1Api.patchNamespacedSecret.mockResolvedValue(mockResponse)
    const result = await k8s.createUpdateGenericSecret(mockCoreV1Api, name, namespace, secretData)

    expect(mockCoreV1Api.createNamespacedSecret).toHaveBeenCalledWith({
      body: {
        data: { password: 'cGFzc3dvcmQxMjM=', username: 'YWRtaW4=' },
        metadata: { name: 'test-secret', namespace: 'default' },
        type: 'Opaque',
      },
      namespace: 'default',
    })
    expect(mockCoreV1Api.patchNamespacedSecret).toHaveBeenCalledWith({
      body: {
        data: { password: 'cGFzc3dvcmQxMjM=', username: 'YWRtaW4=' },
        metadata: { name: 'test-secret', namespace: 'default' },
        type: 'Opaque',
      },
      name: 'test-secret',
      namespace: 'default',
    })

    expect(result).toEqual(mockResponse)
  })

  it('should throw an error if the secret creation fails', async () => {
    const name = 'test-secret'
    const namespace = 'default'
    const secretData = {
      username: 'admin',
      password: 'password123',
    }

    const errorMessage = 'Failed to create secret'
    mockCoreV1Api.createNamespacedSecret.mockRejectedValue(new Error(errorMessage))

    await expect(k8s.createUpdateGenericSecret(mockCoreV1Api, name, namespace, secretData)).rejects.toThrow(
      errorMessage,
    )
  })
})

describe('StatefulSet tests', () => {
  const mockAppsApi = new AppsV1Api({} as any) as jest.Mocked<AppsV1Api>
  const mockCoreApi = new CoreV1Api({} as any) as jest.Mocked<CoreV1Api>
  const mockDebugger = terminal(`k8s:tests:`)
  jest.spyOn(mockDebugger, 'error')

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getPodsOfStatefulSet', () => {
    it('should return pods matching the StatefulSet label selector', async () => {
      const mockStatefulSet = {
        spec: {
          selector: {
            matchLabels: { app: 'my-app' },
          },
        },
      }

      const mockPodList: V1PodList = {
        items: [{ metadata: { name: 'pod-1' } }, { metadata: { name: 'pod-2' } }],
      } as V1PodList

      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue(mockStatefulSet as any)
      mockCoreApi.listNamespacedPod.mockResolvedValue(mockPodList as any)

      const pods = await k8s.getPodsOfStatefulSet(mockAppsApi, 'my-sts', 'my-namespace', mockCoreApi)
      expect(mockAppsApi.readNamespacedStatefulSet).toHaveBeenCalledWith({ name: 'my-sts', namespace: 'my-namespace' })
      expect(mockCoreApi.listNamespacedPod).toHaveBeenCalledWith({
        labelSelector: 'app=my-app',
        namespace: 'my-namespace',
      })
      expect(pods).toEqual(mockPodList)
    })

    it('should throw an error if matchLabels is missing', async () => {
      const mockStatefulSet: V1StatefulSet = {} as V1StatefulSet
      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue(mockStatefulSet as any)

      await expect(k8s.getPodsOfStatefulSet(mockAppsApi, 'my-sts', 'my-namespace', mockCoreApi)).rejects.toThrow(
        'StatefulSet my-sts does not have matchLabels',
      )
    })
  })

  describe('patchContainerResourcesOfSts', () => {
    const mockPodList: V1PodList = {
      items: [
        {
          metadata: { name: 'pod-1' },
          spec: {
            containers: [
              {
                name: 'controller',
                resources: {
                  requests: { cpu: '100m', memory: '256Mi' },
                  limits: { cpu: '200m', memory: '512Mi' },
                },
              },
            ],
          },
        } as V1Pod,
      ],
    }
    const mockStatefulSet = {
      spec: {
        selector: {
          matchLabels: { app: 'my-app' },
        },
      },
    }
    const desiredResources: V1ResourceRequirements = {
      requests: { cpu: '500m', memory: '1Gi' },
      limits: { cpu: '1', memory: '2Gi' },
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should patch the StatefulSet and restart pods if resources do not match', async () => {
      mockCoreApi.listNamespacedPod.mockResolvedValue(mockPodList as any)
      mockCoreApi.deleteNamespacedPod.mockResolvedValue(mockPodList as any)
      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue(mockStatefulSet as any)
      mockAppsApi.patchNamespacedStatefulSet.mockResolvedValue(mockStatefulSet as any)

      const debug = jest.spyOn(mockDebugger, 'info')
      jest.isMockFunction(patchStatefulSetResources)
      jest.isMockFunction(deleteStatefulSetPods)
      await expect(
        k8s.patchContainerResourcesOfSts(
          'argocd-application-controller',
          'argocd',
          'controller',
          desiredResources,
          mockAppsApi,
          mockCoreApi,
          mockDebugger,
        ),
      ).resolves.not.toThrow()

      expect(debug).toHaveBeenNthCalledWith(
        1,
        'sts/argocd-application-controller has been patched with resources: {"requests":{"cpu":"500m","memory":"1Gi"},"limits":{"cpu":"1","memory":"2Gi"}}',
      )
      expect(debug).toHaveBeenNthCalledWith(2, 'sts/argocd-application-controller pods restarted')
    })

    it('should log an error if no pods are found', async () => {
      mockCoreApi.listNamespacedPod.mockResolvedValue({ items: [] } as any)
      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue(mockStatefulSet as any)

      const debugInfo = jest.spyOn(mockDebugger, 'info')
      const debugError = jest.spyOn(mockDebugger, 'error')

      await patchContainerResourcesOfSts(
        'argocd-application-controller',
        'argocd',
        'controller',
        desiredResources,
        mockAppsApi,
        mockCoreApi,
        mockDebugger,
      )
      expect(debugInfo).not.toHaveBeenCalled()
      expect(debugError).toHaveBeenCalledTimes(2)
    })

    it('should not patch resources if they already match', async () => {
      const matchingPodList: V1PodList = {
        items: [
          {
            metadata: { name: 'pod-1' },
            spec: {
              containers: [
                {
                  name: 'controller',
                  resources: desiredResources,
                },
              ],
            },
          } as V1Pod,
        ],
      }
      mockCoreApi.listNamespacedPod.mockResolvedValue(matchingPodList as any)
      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue(mockStatefulSet as any)
      const debug = jest.spyOn(mockDebugger, 'info')

      await patchContainerResourcesOfSts(
        'argocd-application-controller',
        'argocd',
        'controller',
        desiredResources,
        mockAppsApi,
        mockCoreApi,
        mockDebugger,
      )

      expect(debug).toHaveBeenCalledTimes(1)
    })

    it('should log an error if an exception occurs', async () => {
      const error = new Error('API error')
      mockAppsApi.readNamespacedStatefulSet.mockRejectedValue(error)
      const debugInfo = jest.spyOn(mockDebugger, 'info')
      const debugError = jest.spyOn(mockDebugger, 'error')

      await patchContainerResourcesOfSts(
        'argocd-application-controller',
        'argocd',
        'controller',
        desiredResources,
        mockAppsApi,
        mockCoreApi,
        mockDebugger,
      )

      expect(debugInfo).not.toHaveBeenCalled()
      expect(debugError).toHaveBeenCalledWith('Error patching StatefulSet argocd-application-controller:', error)
    })
  })

  describe('patchStatefulSetResources', () => {
    it('should patch StatefulSet resources', async () => {
      const resources: V1ResourceRequirements = {
        requests: {
          cpu: '200m',
          memory: '600Mi',
        },
        limits: {
          cpu: '2',
          memory: '4Gi',
        },
      }
      await k8s.patchStatefulSetResources(
        'my-sts',
        'my-container',
        'my-namespace',
        resources,
        mockAppsApi,
        mockDebugger,
      )

      expect(mockAppsApi.patchNamespacedStatefulSet).toHaveBeenCalledWith(
        {
          body: {
            spec: {
              template: {
                spec: {
                  containers: [
                    {
                      name: 'my-container',
                      resources: { limits: { cpu: '2', memory: '4Gi' }, requests: { cpu: '200m', memory: '600Mi' } },
                    },
                  ],
                },
              },
            },
          },
          name: 'my-sts',
          namespace: 'my-namespace',
        },
        setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
      )
    })

    it('should log an error if patch fails', async () => {
      const error = new Error('Patch failed')
      mockAppsApi.patchNamespacedStatefulSet.mockRejectedValue(error)
      await k8s.patchStatefulSetResources('my-sts', 'my-container', 'my-namespace', {}, mockAppsApi, mockDebugger)

      const debug = jest.spyOn(mockDebugger, 'error')
      expect(debug).toHaveBeenCalledWith('Failed to patch StatefulSet my-sts:', error)
    })
  })

  describe('deleteStatefulSetPods', () => {
    it('should delete all pods of a StatefulSet', async () => {
      const mockPodList: V1PodList = {
        items: [{ metadata: { name: 'pod-1' } }, { metadata: { name: 'pod-2' } }],
      } as V1PodList

      const mockStatefulSet = {
        spec: {
          selector: {
            matchLabels: { app: 'my-app' },
          },
        },
      }

      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue(mockStatefulSet as any)
      mockCoreApi.listNamespacedPod.mockResolvedValue(mockPodList as any)

      await k8s.deleteStatefulSetPods('my-sts', 'my-namespace', mockAppsApi, mockCoreApi, mockDebugger)

      expect(mockCoreApi.deleteNamespacedPod).toHaveBeenCalledWith({ name: 'pod-1', namespace: 'my-namespace' })
      expect(mockCoreApi.deleteNamespacedPod).toHaveBeenCalledWith({ name: 'pod-2', namespace: 'my-namespace' })
    })

    it('should log an error if no pods are found', async () => {
      const mockPodList: V1PodList = { items: [] } as V1PodList
      const mockStatefulSet = {
        spec: {
          selector: {
            matchLabels: { app: 'my-app' },
          },
        },
      }

      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue(mockStatefulSet as any)
      mockCoreApi.listNamespacedPod.mockResolvedValue(mockPodList as any)

      await k8s.deleteStatefulSetPods('my-sts', 'my-namespace', mockAppsApi, mockCoreApi, mockDebugger)
      const debug = jest.spyOn(mockDebugger, 'error')
      expect(debug).toHaveBeenNthCalledWith(1, 'No pods found for StatefulSet my-sts')
      expect(debug).toHaveBeenNthCalledWith(
        2,
        'Failed to delete pods for StatefulSet my-sts:',
        new Error(`No pods found for StatefulSet my-sts`),
      )
    })
  })
})

describe('ArgoCD Application Tests', () => {
  const mockCustomApi = new CustomObjectsApi({} as any) as jest.Mocked<CustomObjectsApi>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkArgoCDAppStatus', () => {
    it('should return status when sync status matches expected', async () => {
      const mockApplication = {
        status: {
          sync: {
            status: 'Synced',
          },
        },
      }
      mockCustomApi.getNamespacedCustomObject.mockResolvedValue(mockApplication as any)

      const result = await checkArgoCDAppStatus('test-app', mockCustomApi, 'sync', 'Synced')

      expect(result).toBe('Synced')
      expect(mockCustomApi.getNamespacedCustomObject).toHaveBeenCalledWith({
        ...ARGOCD_APP_PARAMS,
        name: 'test-app',
      })
    })

    it('should return status when health status matches expected', async () => {
      const mockApplication = {
        status: {
          health: {
            status: 'Healthy',
          },
        },
      }
      mockCustomApi.getNamespacedCustomObject.mockResolvedValue(mockApplication as any)

      const result = await checkArgoCDAppStatus('test-app', mockCustomApi, 'health', 'Healthy')

      expect(result).toBe('Healthy')
    })

    it('should throw error when sync status does not match expected', async () => {
      const mockApplication = {
        status: {
          sync: {
            status: 'OutOfSync',
          },
        },
      }
      mockCustomApi.getNamespacedCustomObject.mockResolvedValue(mockApplication as any)

      await expect(checkArgoCDAppStatus('test-app', mockCustomApi, 'sync', 'Synced')).rejects.toThrow(
        "Application test-app sync status is 'OutOfSync', expected 'Synced'",
      )
    })

    it('should throw error when health status does not match expected', async () => {
      const mockApplication = {
        status: {
          health: {
            status: 'Degraded',
          },
        },
      }
      mockCustomApi.getNamespacedCustomObject.mockResolvedValue(mockApplication as any)

      await expect(checkArgoCDAppStatus('test-app', mockCustomApi, 'health', 'Healthy')).rejects.toThrow(
        "Application test-app health status is 'Degraded', expected 'Healthy'",
      )
    })

    it('should handle missing status fields', async () => {
      const mockApplication = {
        status: {},
      }
      mockCustomApi.getNamespacedCustomObject.mockResolvedValue(mockApplication as any)

      await expect(checkArgoCDAppStatus('test-app', mockCustomApi, 'sync', 'Synced')).rejects.toThrow(
        "Application test-app sync status is 'undefined', expected 'Synced'",
      )
    })

    it('should propagate API errors', async () => {
      const apiError = new Error('API call failed')
      mockCustomApi.getNamespacedCustomObject.mockRejectedValue(apiError)

      await expect(checkArgoCDAppStatus('test-app', mockCustomApi, 'sync', 'Synced')).rejects.toThrow('API call failed')
    })
  })
})

describe('appRevisionMatches', () => {
  const mockCustomApi = new CustomObjectsApi({} as any) as jest.Mocked<CustomObjectsApi>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return true if the current revision equals the expected one', async () => {
    const mockApplication = {
      spec: {
        source: {
          targetRevision: '1',
        },
      },
      status: {
        sync: {
          status: 'Synced',
        },
      },
    }
    mockCustomApi.getNamespacedCustomObject.mockResolvedValue(mockApplication as any)

    const result = await appRevisionMatches('app-name', '1', mockCustomApi)

    expect(result).toBe(true)
    expect(mockCustomApi.getNamespacedCustomObject).toHaveBeenCalledWith({
      ...ARGOCD_APP_PARAMS,
      name: 'app-name',
    })
  })

  it('should return false if the current revision does not equal the expected one', async () => {
    const mockApplication = {
      spec: {
        source: {
          targetRevision: '1',
        },
      },
      status: {
        sync: {
          status: 'Synced',
        },
      },
    }
    mockCustomApi.getNamespacedCustomObject.mockResolvedValue(mockApplication as any)

    const result = await appRevisionMatches('app-name', '2', mockCustomApi)

    expect(result).toBe(false)
    expect(mockCustomApi.getNamespacedCustomObject).toHaveBeenCalledWith({
      ...ARGOCD_APP_PARAMS,
      name: 'app-name',
    })
  })
})

describe('patchArgoCdApp', () => {
  const mockCustomApi = new CustomObjectsApi({} as any) as jest.Mocked<CustomObjectsApi>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call patch endpoint with parameters', async () => {
    await patchArgoCdApp('app-name', '2', 'test-values', mockCustomApi)

    expect(mockCustomApi.patchNamespacedCustomObject).toHaveBeenCalledWith({
      ...ARGOCD_APP_PARAMS,
      name: 'app-name',
      body: [
        { op: 'replace', path: '/spec/source/targetRevision', value: '2' },
        { op: 'replace', path: '/spec/source/helm/values', value: 'test-values' },
      ],
    })
  })
})

describe('restartOtomiApiDeployment', () => {
  let mockAppApi: jest.Mocked<AppsV1Api>

  beforeEach(() => {
    mockAppApi = {
      patchNamespacedDeployment: jest.fn(),
    } as unknown as jest.Mocked<AppsV1Api>

    jest.clearAllMocks()
  })

  it('should successfully restart otomi-api deployment', async () => {
    mockAppApi.patchNamespacedDeployment.mockResolvedValue({} as any)

    await k8s.restartOtomiApiDeployment(mockAppApi)

    expect(mockAppApi.patchNamespacedDeployment).toHaveBeenCalledWith(
      {
        name: 'otomi-api',
        namespace: 'otomi',
        body: {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': expect.any(String),
                },
              },
            },
          },
        },
      },
      setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
    )
  })

  it('should use valid ISO timestamp for restartedAt annotation', async () => {
    mockAppApi.patchNamespacedDeployment.mockResolvedValue({} as any)

    const startTime = new Date()
    await k8s.restartOtomiApiDeployment(mockAppApi)
    const endTime = new Date()

    const call = mockAppApi.patchNamespacedDeployment.mock.calls[0]
    const restartedAt = call[0].body.spec.template.metadata.annotations['kubectl.kubernetes.io/restartedAt']
    const restartedAtTime = new Date(restartedAt)

    expect(restartedAtTime).toBeInstanceOf(Date)
    expect(restartedAtTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime())
    expect(restartedAtTime.getTime()).toBeLessThanOrEqual(endTime.getTime())
  })

  it('should throw error when API call fails', async () => {
    const apiError = new Error('Deployment not found')
    mockAppApi.patchNamespacedDeployment.mockRejectedValue(apiError)

    await expect(k8s.restartOtomiApiDeployment(mockAppApi)).rejects.toThrow('Deployment not found')

    expect(mockAppApi.patchNamespacedDeployment).toHaveBeenCalledTimes(1)
  })

  it('should use correct deployment name and namespace', async () => {
    mockAppApi.patchNamespacedDeployment.mockResolvedValue({} as any)

    await k8s.restartOtomiApiDeployment(mockAppApi)

    const call = mockAppApi.patchNamespacedDeployment.mock.calls[0]
    expect(call[0].name).toBe('otomi-api')
    expect(call[0].namespace).toBe('otomi')
  })

  it('should use strategic merge patch headers', async () => {
    mockAppApi.patchNamespacedDeployment.mockResolvedValue({} as any)

    await k8s.restartOtomiApiDeployment(mockAppApi)

    const call = mockAppApi.patchNamespacedDeployment.mock.calls[0]
    expect(call[1]).toEqual(setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch))
  })
})
