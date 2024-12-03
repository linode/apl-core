/* eslint-disable @typescript-eslint/unbound-method */

import { AppsV1Api, CoreV1Api, V1Pod, V1PodList, V1StatefulSet } from '@kubernetes/client-node'
import * as k8s from './k8s'
import { terminal } from './debug'
import { V1ResourceRequirements } from '@kubernetes/client-node/dist/gen/model/v1ResourceRequirements'
import { deleteStatefulSetPods, patchContainerResourcesOfSts, patchStatefulSetResources } from './k8s'

jest.mock('@kubernetes/client-node')
describe('createGenericSecret', () => {
  const mockCoreV1Api = new CoreV1Api() as jest.Mocked<CoreV1Api>

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

    const mockResponse = { body: { metadata: { name, namespace }, data: encodedData } } as any
    mockCoreV1Api.createNamespacedSecret.mockResolvedValue(mockResponse)
    const result = await k8s.createGenericSecret(mockCoreV1Api, name, namespace, secretData)

    expect(mockCoreV1Api.createNamespacedSecret).toHaveBeenCalledWith(namespace, {
      metadata: { name, namespace },
      data: encodedData,
      type: 'Opaque',
    })

    expect(result).toEqual(mockResponse.body)
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

    await expect(k8s.createGenericSecret(mockCoreV1Api, name, namespace, secretData)).rejects.toThrow(errorMessage)
  })
})

describe('StatefulSet tests', () => {
  const mockAppsApi = new AppsV1Api() as jest.Mocked<AppsV1Api>
  const mockCoreApi = new CoreV1Api() as jest.Mocked<CoreV1Api>
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

      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue({ body: mockStatefulSet } as any)
      mockCoreApi.listNamespacedPod.mockResolvedValue({ body: mockPodList } as any)

      const pods = await k8s.getPodsOfStatefulSet(mockAppsApi, 'my-sts', 'my-namespace', mockCoreApi)
      expect(mockAppsApi.readNamespacedStatefulSet).toHaveBeenCalledWith('my-sts', 'my-namespace')
      expect(mockCoreApi.listNamespacedPod).toHaveBeenCalledWith(
        'my-namespace',
        undefined,
        undefined,
        undefined,
        undefined,
        'app=my-app',
      )
      expect(pods).toEqual(mockPodList)
    })

    it('should throw an error if matchLabels is missing', async () => {
      const mockStatefulSet: V1StatefulSet = {} as V1StatefulSet
      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue({ body: mockStatefulSet } as any)

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
      mockCoreApi.listNamespacedPod.mockResolvedValue({ body: mockPodList } as any)
      mockCoreApi.deleteNamespacedPod.mockResolvedValue({ body: mockPodList } as any)
      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue({ body: mockStatefulSet } as any)
      mockAppsApi.patchNamespacedStatefulSet.mockResolvedValue({ body: mockStatefulSet } as any)

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

      // expect(debug).toHaveBeenNthCalledWith(1, 'sts/argocd-application-controller pod has not desired resources')
      expect(debug).toHaveBeenNthCalledWith(
        2,
        'sts/argocd-application-controller has been patched with resources: {"requests":{"cpu":"500m","memory":"1Gi"},"limits":{"cpu":"1","memory":"2Gi"}}',
      )
      expect(debug).toHaveBeenNthCalledWith(3, 'sts/argocd-application-controller pods restarted')
    })

    it('should log an error if no pods are found', async () => {
      mockCoreApi.listNamespacedPod.mockResolvedValue({ body: { items: [] } } as any)
      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue({ body: mockStatefulSet } as any)

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
      expect(debugInfo).not.toBeCalled()
      expect(debugError).toBeCalledTimes(2)
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
      mockCoreApi.listNamespacedPod.mockResolvedValue({ body: matchingPodList } as any)
      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue({ body: mockStatefulSet } as any)
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

      expect(debug).toBeCalledTimes(0)
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

      expect(debugInfo).not.toBeCalled()
      expect(debugError).toBeCalledWith('Error patching StatefulSet argocd-application-controller:', error)
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
        'my-sts',
        'my-namespace',
        {
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    name: 'my-container',
                    resources: {
                      requests: {
                        cpu: '200m',
                        memory: '600Mi',
                      },
                      limits: {
                        cpu: '2',
                        memory: '4Gi',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } },
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

      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue({ body: mockStatefulSet } as any)
      mockCoreApi.listNamespacedPod.mockResolvedValue({ body: mockPodList } as any)

      await k8s.deleteStatefulSetPods('my-sts', 'my-namespace', mockAppsApi, mockCoreApi, mockDebugger)

      expect(mockCoreApi.deleteNamespacedPod).toHaveBeenCalledWith('pod-1', 'my-namespace')
      expect(mockCoreApi.deleteNamespacedPod).toHaveBeenCalledWith('pod-2', 'my-namespace')
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

      mockAppsApi.readNamespacedStatefulSet.mockResolvedValue({ body: mockStatefulSet } as any)
      mockCoreApi.listNamespacedPod.mockResolvedValue({ body: mockPodList } as any)

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
