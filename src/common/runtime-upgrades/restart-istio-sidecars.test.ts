import { CoreV1Api, V1OwnerReference } from '@kubernetes/client-node'
import {
  deletePod,
  detectAndRestartOutdatedIstioSidecars,
  getDeploymentNameFromReplicaSet,
  getIstioVersionFromDeployment,
  isPodManagedByTekton,
  restartCluster,
  restartDeployment,
  restartPodOwner,
  restartStatefulSet,
} from './restart-istio-sidecars'
import { $ } from 'zx'
import { k8s } from '../k8s'

jest.mock('zx')
jest.mock('../k8s')

describe('getIstioVersionFromDeployment', () => {
  const mockAppApi = {
    listNamespacedDeployment: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(k8s.app as jest.Mock).mockReturnValue(mockAppApi)
  })

  it('should extract version from istiod deployment discovery container image', async () => {
    mockAppApi.listNamespacedDeployment.mockResolvedValue({
      items: [
        {
          metadata: { name: 'istiod-1-26-0' },
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    name: 'discovery',
                    image: 'docker.io/istio/pilot:1.26.0',
                  },
                ],
              },
            },
          },
        },
      ],
    })

    const version = await getIstioVersionFromDeployment()

    expect(version).toBe('1.26.0')
    expect(mockAppApi.listNamespacedDeployment).toHaveBeenCalledWith({
      namespace: 'istio-system',
    })
  })

  it('should find deployment with exact name istiod', async () => {
    mockAppApi.listNamespacedDeployment.mockResolvedValue({
      items: [
        {
          metadata: { name: 'istiod' },
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    name: 'discovery',
                    image: 'docker.io/istio/pilot:1.25.1',
                  },
                ],
              },
            },
          },
        },
      ],
    })

    const version = await getIstioVersionFromDeployment()

    expect(version).toBe('1.25.1')
  })

  it('should return null when no istiod deployment found', async () => {
    mockAppApi.listNamespacedDeployment.mockResolvedValue({
      items: [
        {
          metadata: { name: 'other-deployment' },
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    name: 'discovery',
                    image: 'docker.io/istio/pilot:1.20.1',
                  },
                ],
              },
            },
          },
        },
      ],
    })

    const version = await getIstioVersionFromDeployment()

    expect(version).toBeNull()
  })

  it('should return null when no discovery container found', async () => {
    mockAppApi.listNamespacedDeployment.mockResolvedValue({
      items: [
        {
          metadata: { name: 'istiod-1-26-0' },
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    name: 'other-container',
                    image: 'docker.io/istio/pilot:1.26.0',
                  },
                ],
              },
            },
          },
        },
      ],
    })

    const version = await getIstioVersionFromDeployment()

    expect(version).toBeNull()
  })

  it('should return null when image tag is latest', async () => {
    mockAppApi.listNamespacedDeployment.mockResolvedValue({
      items: [
        {
          metadata: { name: 'istiod-1-26-0' },
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    name: 'discovery',
                    image: 'docker.io/istio/pilot:latest',
                  },
                ],
              },
            },
          },
        },
      ],
    })

    const version = await getIstioVersionFromDeployment()

    expect(version).toBeNull()
  })

  it('should handle different image formats', async () => {
    mockAppApi.listNamespacedDeployment.mockResolvedValue({
      items: [
        {
          metadata: { name: 'istiod-1-19-0' },
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    name: 'discovery',
                    image: 'istio/pilot:1.19.0',
                  },
                ],
              },
            },
          },
        },
      ],
    })

    const version = await getIstioVersionFromDeployment()

    expect(version).toBe('1.19.0')
  })

  it('should throw error when API call fails', async () => {
    const error = new Error('API call failed')
    mockAppApi.listNamespacedDeployment.mockRejectedValue(error)

    await expect(getIstioVersionFromDeployment()).rejects.toThrow('API call failed')
  })

  it('should return null when deployment has no containers', async () => {
    mockAppApi.listNamespacedDeployment.mockResolvedValue({
      items: [
        {
          metadata: { name: 'istiod-1-26-0' },
          spec: {
            template: {
              spec: {
                containers: [],
              },
            },
          },
        },
      ],
    })

    const version = await getIstioVersionFromDeployment()

    expect(version).toBeNull()
  })
})

describe('getDeploymentNameFromReplicaSet', () => {
  it('should extract deployment name from valid ReplicaSet name with 8-character hash', () => {
    const result = getDeploymentNameFromReplicaSet('my-deployment-abcd1234')
    expect(result).toBe('my-deployment')
  })

  it('should extract deployment name from valid ReplicaSet name with 10-character hash', () => {
    const result = getDeploymentNameFromReplicaSet('my-deployment-abcd123456')
    expect(result).toBe('my-deployment')
  })

  it('should extract deployment name from complex deployment name', () => {
    const result = getDeploymentNameFromReplicaSet('team-alpha-service-frontend-abcd1234')
    expect(result).toBe('team-alpha-service-frontend')
  })

  it('should return null for invalid ReplicaSet name format', () => {
    const result = getDeploymentNameFromReplicaSet('invalid-name')
    expect(result).toBeNull()
  })

  it('should return null for ReplicaSet name with hash too short', () => {
    const result = getDeploymentNameFromReplicaSet('my-deployment-abc123')
    expect(result).toBeNull()
  })

  it('should return null for ReplicaSet name with hash too long', () => {
    const result = getDeploymentNameFromReplicaSet('my-deployment-abcd123456789')
    expect(result).toBeNull()
  })

  it('should return null for ReplicaSet name with uppercase in hash', () => {
    const result = getDeploymentNameFromReplicaSet('my-deployment-ABCD1234')
    expect(result).toBeNull()
  })

  it('should handle deployment names with hyphens correctly', () => {
    const result = getDeploymentNameFromReplicaSet('my-complex-deployment-name-abcd1234')
    expect(result).toBe('my-complex-deployment-name')
  })
})

describe('restartStatefulSet', () => {
  let mockOwnerRef: V1OwnerReference
  let mockRestartedDeployments: Set<string>
  let mockD: any
  let mockAppApi: any

  beforeEach(() => {
    mockOwnerRef = {
      kind: 'StatefulSet',
      name: 'test-statefulset',
      apiVersion: 'apps/v1',
      uid: 'test-uid',
    }
    mockRestartedDeployments = new Set<string>()
    mockD = {
      info: jest.fn(),
    }
    mockAppApi = {
      patchNamespacedStatefulSet: jest.fn().mockResolvedValue({}),
    }
    ;(k8s.app as jest.Mock).mockReturnValue(mockAppApi)
    jest.clearAllMocks()
  })

  it('should restart StatefulSet when not in dry run mode', async () => {
    const mockParsedArgs = { dryRun: false, local: false }

    await restartStatefulSet(mockOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(mockD.info).toHaveBeenCalledWith('Restarting StatefulSet test-statefulset in namespace test-namespace')
    expect(mockD.info).toHaveBeenCalledWith('Successfully restarted StatefulSet test-statefulset')
    expect(mockAppApi.patchNamespacedStatefulSet).toHaveBeenCalledWith(
      {
        name: 'test-statefulset',
        namespace: 'test-namespace',
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
      expect.any(Object),
    )
  })

  it('should not restart StatefulSet in dry run mode', async () => {
    const mockParsedArgs = { dryRun: true, local: false }

    await restartStatefulSet(mockOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(mockD.info).toHaveBeenCalledWith(
      'Dry run mode - would restart StatefulSet test-statefulset in namespace test-namespace',
    )
  })

  it('should not restart StatefulSet in local mode', async () => {
    const mockParsedArgs = { dryRun: false, local: true }

    await restartStatefulSet(mockOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(mockD.info).toHaveBeenCalledWith(
      'Dry run mode - would restart StatefulSet test-statefulset in namespace test-namespace',
    )
  })

  // This test is no longer relevant as duplicate checking moved to restartPodOwner
})

describe('restartCluster', () => {
  let mockOwnerRef: V1OwnerReference
  let mockRestartedDeployments: Set<string>
  let mockD: any

  beforeEach(() => {
    mockOwnerRef = {
      kind: 'Cluster',
      name: 'test-cluster',
      apiVersion: 'postgresql.cnpg.io/v1',
      uid: 'test-uid',
    }
    mockRestartedDeployments = new Set<string>()
    mockD = {
      info: jest.fn(),
    }
    jest.clearAllMocks()
  })

  it('should restart CloudNativePG Cluster when not in dry run mode', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const mockExec = jest.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    ;($ as unknown as jest.Mock).mockImplementation(mockExec)

    await restartCluster(mockOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(mockD.info).toHaveBeenCalledWith('Restarting CloudNativePG Cluster test-cluster in namespace test-namespace')
    expect(mockD.info).toHaveBeenCalledWith('Successfully initiated rolling restart for Cluster test-cluster')
  })

  it('should not restart Cluster in dry run mode', async () => {
    const mockParsedArgs = { dryRun: true, local: false }

    await restartCluster(mockOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(mockD.info).toHaveBeenCalledWith(
      'Dry run mode - would restart CloudNativePG Cluster test-cluster in namespace test-namespace',
    )
  })

  it('should not restart Cluster in local mode', async () => {
    const mockParsedArgs = { dryRun: false, local: true }

    await restartCluster(mockOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(mockD.info).toHaveBeenCalledWith(
      'Dry run mode - would restart CloudNativePG Cluster test-cluster in namespace test-namespace',
    )
  })

  // This test is no longer relevant as duplicate checking moved to restartPodOwner
})

describe('restartDeployment', () => {
  let mockOwnerRef: V1OwnerReference
  let mockRestartedDeployments: Set<string>
  let mockD: any

  beforeEach(() => {
    mockOwnerRef = {
      kind: 'ReplicaSet',
      name: 'test-deployment-abcd1234',
      apiVersion: 'apps/v1',
      uid: 'test-uid',
    }
    mockRestartedDeployments = new Set<string>()
    mockD = {
      info: jest.fn(),
    }
    jest.clearAllMocks()
  })

  it('should restart Deployment when not in dry run mode', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const mockAppApi = {
      patchNamespacedDeployment: jest.fn().mockResolvedValue({}),
    }
    ;(k8s.app as jest.Mock).mockReturnValue(mockAppApi)

    const result = await restartDeployment(mockOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(result).toBe('test-deployment')
    expect(mockD.info).toHaveBeenCalledWith('Restarting deployment test-deployment in namespace test-namespace')
    expect(mockD.info).toHaveBeenCalledWith('Successfully restarted deployment test-deployment')
    expect(mockAppApi.patchNamespacedDeployment).toHaveBeenCalledWith(
      {
        name: 'test-deployment',
        namespace: 'test-namespace',
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
      expect.any(Object),
    )
  })

  it('should not restart Deployment in dry run mode', async () => {
    const mockParsedArgs = { dryRun: true, local: false }

    const result = await restartDeployment(mockOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(result).toBe('test-deployment')
    expect(mockD.info).toHaveBeenCalledWith(
      'Dry run mode - would restart deployment test-deployment in namespace test-namespace',
    )
  })

  it('should not restart Deployment in local mode', async () => {
    const mockParsedArgs = { dryRun: false, local: true }

    const result = await restartDeployment(mockOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(result).toBe('test-deployment')
    expect(mockD.info).toHaveBeenCalledWith(
      'Dry run mode - would restart deployment test-deployment in namespace test-namespace',
    )
  })

  // This test is no longer relevant as duplicate checking moved to restartPodOwner

  it('should handle invalid ReplicaSet name gracefully', async () => {
    const invalidOwnerRef: V1OwnerReference = {
      kind: 'ReplicaSet',
      name: 'invalid-name',
      apiVersion: 'apps/v1',
      uid: 'test-uid',
    }
    const mockParsedArgs = { dryRun: false, local: false }

    const result = await restartDeployment(invalidOwnerRef, 'test-namespace', mockParsedArgs, mockD)

    expect(result).toBeNull()
    expect(mockD.info).toHaveBeenCalledWith(
      'Could not extract deployment name from ReplicaSet invalid-name, skipping restart',
    )
  })
})

describe('isPodManagedByTekton', () => {
  it('should return true for pods managed by EventListener', () => {
    const pod = {
      metadata: {
        labels: {
          'app.kubernetes.io/managed-by': 'EventListener',
        },
      },
    }

    expect(isPodManagedByTekton(pod)).toBe(true)
  })

  it('should return true for pods with eventlistener label', () => {
    const pod = {
      metadata: {
        labels: {
          eventlistener: 'gitea-webhook-main',
        },
      },
    }

    expect(isPodManagedByTekton(pod)).toBe(true)
  })

  it('should return true for pods part of Triggers', () => {
    const pod = {
      metadata: {
        labels: {
          'app.kubernetes.io/part-of': 'Triggers',
        },
      },
    }

    expect(isPodManagedByTekton(pod)).toBe(true)
  })

  it('should return false for pods not managed by Tekton', () => {
    const pod = {
      metadata: {
        labels: {
          'app.kubernetes.io/managed-by': 'Deployment',
          'app.kubernetes.io/part-of': 'SomeOtherApp',
        },
      },
    }

    expect(isPodManagedByTekton(pod)).toBe(false)
  })

  it('should return false for pods without labels', () => {
    const pod = {
      metadata: {},
    }

    expect(isPodManagedByTekton(pod)).toBe(false)
  })

  it('should return false for pods without metadata', () => {
    const pod = {}

    expect(isPodManagedByTekton(pod)).toBe(false)
  })
})

describe('deletePod', () => {
  let mockD: any
  let mockCoreApi: any

  beforeEach(() => {
    mockD = {
      info: jest.fn(),
    }
    mockCoreApi = {
      deleteNamespacedPod: jest.fn().mockResolvedValue({}),
    }
    ;(k8s.core as jest.Mock).mockReturnValue(mockCoreApi)
    jest.clearAllMocks()
  })

  it('should delete pod when not in dry run mode', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const pod = {
      metadata: {
        name: 'test-pod',
        namespace: 'test-namespace',
      },
    }

    await deletePod(pod, mockD, mockParsedArgs)

    expect(mockD.info).toHaveBeenCalledWith('Deleting pod test-namespace/test-pod to refresh Istio sidecar')
    expect(mockD.info).toHaveBeenCalledWith('Successfully deleted pod test-pod')
    expect(mockCoreApi.deleteNamespacedPod).toHaveBeenCalledWith({
      name: 'test-pod',
      namespace: 'test-namespace',
    })
  })

  it('should not delete pod in dry run mode', async () => {
    const mockParsedArgs = { dryRun: true, local: false }
    const pod = {
      metadata: {
        name: 'test-pod',
        namespace: 'test-namespace',
      },
    }

    await deletePod(pod, mockD, mockParsedArgs)

    expect(mockD.info).toHaveBeenCalledWith('Dry run mode - would delete pod test-namespace/test-pod')
    expect(mockCoreApi.deleteNamespacedPod).not.toHaveBeenCalled()
  })

  it('should not delete pod in local mode', async () => {
    const mockParsedArgs = { dryRun: false, local: true }
    const pod = {
      metadata: {
        name: 'test-pod',
        namespace: 'test-namespace',
      },
    }

    await deletePod(pod, mockD, mockParsedArgs)

    expect(mockD.info).toHaveBeenCalledWith('Dry run mode - would delete pod test-namespace/test-pod')
    expect(mockCoreApi.deleteNamespacedPod).not.toHaveBeenCalled()
  })

  it('should handle pods without name gracefully', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const pod = {
      metadata: {
        namespace: 'test-namespace',
      },
    }

    await deletePod(pod, mockD, mockParsedArgs)

    expect(mockD.info).not.toHaveBeenCalled()
    expect(mockCoreApi.deleteNamespacedPod).not.toHaveBeenCalled()
  })

  it('should handle pods without namespace gracefully', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const pod = {
      metadata: {
        name: 'test-pod',
      },
    }

    await deletePod(pod, mockD, mockParsedArgs)

    expect(mockD.info).not.toHaveBeenCalled()
    expect(mockCoreApi.deleteNamespacedPod).not.toHaveBeenCalled()
  })
})

describe('restartPodOwner', () => {
  let mockRestartedDeployments: Set<string>
  let mockD: any
  let mockPod: any

  beforeEach(() => {
    mockRestartedDeployments = new Set<string>()
    mockD = {
      info: jest.fn(),
      warn: jest.fn(),
    }
    jest.clearAllMocks()
  })

  it('should restart StatefulSet owner', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const mockAppApi = {
      patchNamespacedStatefulSet: jest.fn().mockResolvedValue({}),
    }
    ;(k8s.app as jest.Mock).mockReturnValue(mockAppApi)

    mockPod = {
      metadata: {
        namespace: 'test-namespace',
        ownerReferences: [
          {
            kind: 'StatefulSet',
            name: 'test-statefulset',
            apiVersion: 'apps/v1',
            uid: 'test-uid',
          },
        ],
      },
    }

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    // Duplicate checking is now handled at the caller level
    expect(mockD.info).toHaveBeenCalledWith('Restarting StatefulSet test-statefulset in namespace test-namespace')
  })

  it('should restart CloudNativePG Cluster owner', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const mockExec = jest.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    ;($ as unknown as jest.Mock).mockImplementation(mockExec)

    mockPod = {
      metadata: {
        namespace: 'test-namespace',
        ownerReferences: [
          {
            kind: 'Cluster',
            name: 'test-cluster',
            apiVersion: 'postgresql.cnpg.io/v1',
            uid: 'test-uid',
          },
        ],
      },
    }

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    // Duplicate checking is now handled at the caller level
    expect(mockD.info).toHaveBeenCalledWith('Restarting CloudNativePG Cluster test-cluster in namespace test-namespace')
  })

  it('should restart Deployment via ReplicaSet owner', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const mockAppApi = {
      patchNamespacedDeployment: jest.fn().mockResolvedValue({}),
    }
    ;(k8s.app as jest.Mock).mockReturnValue(mockAppApi)

    mockPod = {
      metadata: {
        namespace: 'test-namespace',
        ownerReferences: [
          {
            kind: 'ReplicaSet',
            name: 'test-deployment-abcd1234',
            apiVersion: 'apps/v1',
            uid: 'test-uid',
          },
        ],
      },
    }

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    // Duplicate checking is now handled at the caller level
    expect(mockD.info).toHaveBeenCalledWith('Restarting deployment test-deployment in namespace test-namespace')
  })

  it('should warn about standalone pods with no owner references', async () => {
    const mockParsedArgs = { dryRun: false, local: false }

    mockPod = {
      metadata: {
        namespace: 'test-namespace',
        name: 'standalone-pod',
      },
    }

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    expect(mockD.warn).toHaveBeenCalledWith(
      'Pod test-namespace/standalone-pod has no owner references (standalone pod). Cannot automatically restart - manual intervention required to update Istio sidecar.',
    )
    expect(mockD.info).not.toHaveBeenCalled()
  })

  it('should warn about standalone pods with empty owner references', async () => {
    const mockParsedArgs = { dryRun: false, local: false }

    mockPod = {
      metadata: {
        namespace: 'test-namespace',
        name: 'standalone-pod',
        ownerReferences: [],
      },
    }

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    expect(mockD.warn).toHaveBeenCalledWith(
      'Pod test-namespace/standalone-pod has no owner references (standalone pod). Cannot automatically restart - manual intervention required to update Istio sidecar.',
    )
    expect(mockD.info).not.toHaveBeenCalled()
  })

  it('should delete Tekton-managed pods instead of restarting deployment', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const mockCoreApi = {
      deleteNamespacedPod: jest.fn().mockResolvedValue({}),
    }
    ;(k8s.core as jest.Mock).mockReturnValue(mockCoreApi)

    mockPod = {
      metadata: {
        namespace: 'team-labs',
        name: 'el-gitea-webhook-main-abc123',
        labels: {
          'app.kubernetes.io/managed-by': 'EventListener',
          eventlistener: 'gitea-webhook-main',
        },
        ownerReferences: [
          {
            kind: 'ReplicaSet',
            name: 'el-gitea-webhook-main-abc123',
            apiVersion: 'apps/v1',
            uid: 'test-uid',
          },
        ],
      },
    }

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    expect(mockD.info).toHaveBeenCalledWith(
      'Deleting pod team-labs/el-gitea-webhook-main-abc123 to refresh Istio sidecar',
    )
    expect(mockCoreApi.deleteNamespacedPod).toHaveBeenCalledWith({
      name: 'el-gitea-webhook-main-abc123',
      namespace: 'team-labs',
    })
  })

  it('should handle pods with no metadata', async () => {
    const mockParsedArgs = { dryRun: false, local: false }

    mockPod = {}

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    // No restart attempted since deployment name extraction failed
    expect(mockD.info).not.toHaveBeenCalled()
  })

  it('should handle multiple owner references', async () => {
    const mockParsedArgs = { dryRun: true, local: false }
    const mockAppApi = {
      patchNamespacedStatefulSet: jest.fn().mockResolvedValue({}),
      patchNamespacedDeployment: jest.fn().mockResolvedValue({}),
    }
    ;(k8s.app as jest.Mock).mockReturnValue(mockAppApi)

    mockPod = {
      metadata: {
        namespace: 'test-namespace',
        ownerReferences: [
          {
            kind: 'StatefulSet',
            name: 'test-statefulset',
            apiVersion: 'apps/v1',
            uid: 'test-uid-1',
          },
          {
            kind: 'ReplicaSet',
            name: 'test-deployment-abcd1234',
            apiVersion: 'apps/v1',
            uid: 'test-uid-2',
          },
        ],
      },
    }

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    // Should process both owner references
    // Duplicate checking is now handled at the caller level
    // Duplicate checking is now handled at the caller level
    expect(mockD.info).toHaveBeenCalledWith(
      'Dry run mode - would restart StatefulSet test-statefulset in namespace test-namespace',
    )
    expect(mockD.info).toHaveBeenCalledWith(
      'Dry run mode - would restart deployment test-deployment in namespace test-namespace',
    )
  })

  it('should handle errors gracefully', async () => {
    const mockParsedArgs = { dryRun: false, local: false }
    const mockAppApi = {
      patchNamespacedStatefulSet: jest.fn().mockRejectedValue(new Error('API call failed')),
    }
    ;(k8s.app as jest.Mock).mockReturnValue(mockAppApi)

    mockPod = {
      metadata: {
        namespace: 'test-namespace',
        name: 'test-pod',
        ownerReferences: [
          {
            kind: 'StatefulSet',
            name: 'test-statefulset',
            apiVersion: 'apps/v1',
            uid: 'test-uid',
          },
        ],
      },
    }

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    expect(mockD.warn).toHaveBeenCalledWith(
      'Could not restart StatefulSet for pod test-namespace/test-pod:',
      expect.any(Error),
    )
  })
})

describe('detectAndRestartOutdatedIstioSidecars', () => {
  const mockCoreApi = {
    listPodForAllNamespaces: jest.fn(),
  } as unknown as jest.Mocked<CoreV1Api>

  const mockDeps = {
    getDeploymentState: jest.fn(),
    getWorkloadKeyFromPod: jest.fn(),
    restartPodOwner: jest.fn(),
    getIstioVersionFromDeployment: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return early if expected Istio version is not found', async () => {
    mockDeps.getIstioVersionFromDeployment.mockResolvedValue(null)

    await detectAndRestartOutdatedIstioSidecars(mockCoreApi, mockDeps)

    expect(mockDeps.getIstioVersionFromDeployment).toHaveBeenCalled()
    expect(mockCoreApi.listPodForAllNamespaces).not.toHaveBeenCalled()
    expect(mockDeps.restartPodOwner).not.toHaveBeenCalled()
  })

  it('should restart pod owners with outdated sidecars', async () => {
    mockDeps.getIstioVersionFromDeployment.mockResolvedValue('1.25.1')
    mockDeps.getWorkloadKeyFromPod.mockReturnValue('ns/deploy')
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({
      items: [
        {
          metadata: { namespace: 'ns', name: 'pod-1' },
          spec: {
            containers: [
              {
                image: 'istio/proxyv2:1.20.0',
                name: '',
              },
            ],
            initContainers: [],
          },
        },
      ],
    })

    await detectAndRestartOutdatedIstioSidecars(mockCoreApi, mockDeps)

    expect(mockDeps.getIstioVersionFromDeployment).toHaveBeenCalled()
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalledWith({
      labelSelector: 'security.istio.io/tlsMode=istio',
    })
    expect(mockDeps.restartPodOwner).toHaveBeenCalledTimes(1)
  })

  it('should not restart if sidecars are up to date', async () => {
    mockDeps.getIstioVersionFromDeployment.mockResolvedValue('1.25.1')
    mockDeps.getWorkloadKeyFromPod.mockReturnValue('ns/deploy')
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({
      items: [
        {
          metadata: { namespace: 'ns', name: 'pod-1' },
          spec: {
            containers: [
              {
                image: 'istio/proxyv2:1.25.1',
                name: '',
              },
            ],
            initContainers: [],
          },
        },
      ],
    })

    await detectAndRestartOutdatedIstioSidecars(mockCoreApi, mockDeps)

    expect(mockDeps.getIstioVersionFromDeployment).toHaveBeenCalled()
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalledWith({
      labelSelector: 'security.istio.io/tlsMode=istio',
    })
    expect(mockDeps.restartPodOwner).not.toHaveBeenCalled()
  })

  it('should handle empty pod list', async () => {
    mockDeps.getIstioVersionFromDeployment.mockResolvedValue('1.25.1')
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({
      items: [],
    })

    await detectAndRestartOutdatedIstioSidecars(mockCoreApi, mockDeps)

    expect(mockDeps.getIstioVersionFromDeployment).toHaveBeenCalled()
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalledWith({
      labelSelector: 'security.istio.io/tlsMode=istio',
    })
    expect(mockDeps.restartPodOwner).not.toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    mockDeps.getIstioVersionFromDeployment.mockResolvedValue('1.25.1')
    mockCoreApi.listPodForAllNamespaces.mockRejectedValue(new Error('API call failed'))

    await detectAndRestartOutdatedIstioSidecars(mockCoreApi, mockDeps)

    expect(mockDeps.getIstioVersionFromDeployment).toHaveBeenCalled()
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalledWith({
      labelSelector: 'security.istio.io/tlsMode=istio',
    })
    expect(mockDeps.restartPodOwner).not.toHaveBeenCalled()
  })
})
