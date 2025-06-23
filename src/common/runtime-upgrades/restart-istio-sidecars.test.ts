import { CoreV1Api, V1OwnerReference } from '@kubernetes/client-node'
import {
  detectAndRestartOutdatedIstioSidecars,
  getDeploymentNameFromReplicaSet,
  getIstioVersionFromPod,
  restartCluster,
  restartDeployment,
  restartPodOwner,
  restartStatefulSet,
} from './restart-istio-sidecars'
import { $ } from 'zx'
import { k8s } from '../k8s'

jest.mock('zx')
jest.mock('../k8s')

describe('getIstioVersionFromPod', () => {
  const mockCoreApi = {
    listNamespacedPod: jest.fn(),
  } as unknown as jest.Mocked<CoreV1Api>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should extract version from istiod discovery container image', async () => {
    mockCoreApi.listNamespacedPod.mockResolvedValue({
      items: [
        {
          status: { phase: 'Running' },
          spec: {
            containers: [
              {
                name: 'discovery',
                image: 'docker.io/istio/pilot:1.20.1',
              },
            ],
          },
        },
      ],
    } as any)

    const version = await getIstioVersionFromPod(mockCoreApi)

    expect(version).toBe('1.20.1')
    expect(mockCoreApi.listNamespacedPod).toHaveBeenCalledWith({
      namespace: 'istio-system',
      labelSelector: 'app=istiod',
    })
  })

  it('should return null when no running istiod pods found', async () => {
    mockCoreApi.listNamespacedPod.mockResolvedValue({
      items: [
        {
          status: { phase: 'Pending' },
          spec: {
            containers: [
              {
                name: 'discovery',
                image: 'docker.io/istio/pilot:1.20.1',
              },
            ],
          },
        },
      ],
    } as any)

    const version = await getIstioVersionFromPod(mockCoreApi)

    expect(version).toBeNull()
  })

  it('should return null when no discovery container found', async () => {
    mockCoreApi.listNamespacedPod.mockResolvedValue({
      items: [
        {
          status: { phase: 'Running' },
          spec: {
            containers: [
              {
                name: 'other-container',
                image: 'docker.io/istio/pilot:1.20.1',
              },
            ],
          },
        },
      ],
    } as any)

    const version = await getIstioVersionFromPod(mockCoreApi)

    expect(version).toBeNull()
  })

  it('should return null when image tag is latest', async () => {
    mockCoreApi.listNamespacedPod.mockResolvedValue({
      items: [
        {
          status: { phase: 'Running' },
          spec: {
            containers: [
              {
                name: 'discovery',
                image: 'docker.io/istio/pilot:latest',
              },
            ],
          },
        },
      ],
    } as any)

    const version = await getIstioVersionFromPod(mockCoreApi)

    expect(version).toBeNull()
  })

  it('should handle different image formats', async () => {
    mockCoreApi.listNamespacedPod.mockResolvedValue({
      items: [
        {
          status: { phase: 'Running' },
          spec: {
            containers: [
              {
                name: 'discovery',
                image: 'istio/pilot:1.19.0',
              },
            ],
          },
        },
      ],
    } as any)

    const version = await getIstioVersionFromPod(mockCoreApi)

    expect(version).toBe('1.19.0')
  })

  it('should throw error when API call fails', async () => {
    const error = new Error('API call failed')
    mockCoreApi.listNamespacedPod.mockRejectedValue(error)

    await expect(getIstioVersionFromPod(mockCoreApi)).rejects.toThrow('API call failed')
  })

  it('should return null when no pods found', async () => {
    mockCoreApi.listNamespacedPod.mockResolvedValue({
      items: [],
    } as any)

    const version = await getIstioVersionFromPod(mockCoreApi)

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

  it('should handle pods with no owner references', async () => {
    const mockParsedArgs = { dryRun: false, local: false }

    mockPod = {
      metadata: {
        namespace: 'test-namespace',
      },
    }

    await restartPodOwner(mockPod, mockD, mockParsedArgs)

    // No restart attempted since deployment name extraction failed
    expect(mockD.info).not.toHaveBeenCalled()
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
    getCurrentVersion: jest.fn(),
    getWorkloadKeyFromPod: jest.fn(),
    restartPodOwner: jest.fn(),
    getIstioVersionFromPod: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return early if expected Istio version is not found', async () => {
    mockDeps.getIstioVersionFromPod.mockResolvedValue(null)

    await detectAndRestartOutdatedIstioSidecars(mockCoreApi, mockDeps)

    expect(mockDeps.getIstioVersionFromPod).toHaveBeenCalledWith(mockCoreApi)
    expect(mockCoreApi.listPodForAllNamespaces).not.toHaveBeenCalled()
    expect(mockDeps.restartPodOwner).not.toHaveBeenCalled()
  })

  it('should restart pod owners with outdated sidecars', async () => {
    mockDeps.getIstioVersionFromPod.mockResolvedValue('1.25.1')
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

    expect(mockDeps.getIstioVersionFromPod).toHaveBeenCalledWith(mockCoreApi)
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalledWith({
      labelSelector: 'security.istio.io/tlsMode=istio',
    })
    expect(mockDeps.restartPodOwner).toHaveBeenCalledTimes(1)
  })

  it('should not restart if sidecars are up to date', async () => {
    mockDeps.getIstioVersionFromPod.mockResolvedValue('1.25.1')
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

    expect(mockDeps.getIstioVersionFromPod).toHaveBeenCalledWith(mockCoreApi)
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalledWith({
      labelSelector: 'security.istio.io/tlsMode=istio',
    })
    expect(mockDeps.restartPodOwner).not.toHaveBeenCalled()
  })

  it('should handle empty pod list', async () => {
    mockDeps.getIstioVersionFromPod.mockResolvedValue('1.25.1')
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({
      items: [],
    })

    await detectAndRestartOutdatedIstioSidecars(mockCoreApi, mockDeps)

    expect(mockDeps.getIstioVersionFromPod).toHaveBeenCalledWith(mockCoreApi)
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalledWith({
      labelSelector: 'security.istio.io/tlsMode=istio',
    })
    expect(mockDeps.restartPodOwner).not.toHaveBeenCalled()
  })

  it('should handle API errors gracefully', async () => {
    mockDeps.getIstioVersionFromPod.mockResolvedValue('1.25.1')
    mockCoreApi.listPodForAllNamespaces.mockRejectedValue(new Error('API call failed'))

    await detectAndRestartOutdatedIstioSidecars(mockCoreApi, mockDeps)

    expect(mockDeps.getIstioVersionFromPod).toHaveBeenCalledWith(mockCoreApi)
    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalledWith({
      labelSelector: 'security.istio.io/tlsMode=istio',
    })
    expect(mockDeps.restartPodOwner).not.toHaveBeenCalled()
  })
})
