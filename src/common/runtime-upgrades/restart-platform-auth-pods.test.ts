import { CoreV1Api } from '@kubernetes/client-node'
import { PLATFORM_AUTH_LABEL_SELECTOR, restartPlatformAuthPods } from './restart-platform-auth-pods'

describe('restartPlatformAuthPods', () => {
  const mockCoreApi = {
    listPodForAllNamespaces: jest.fn(),
  } as unknown as jest.Mocked<CoreV1Api>

  const mockDeps = {
    getWorkloadKeyFromPod: jest.fn(),
    restartPodOwner: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lists pods labelled otomi.io/auth=platform', async () => {
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({ items: [] })

    await restartPlatformAuthPods(mockCoreApi, mockDeps)

    expect(mockCoreApi.listPodForAllNamespaces).toHaveBeenCalledWith({
      labelSelector: PLATFORM_AUTH_LABEL_SELECTOR,
    })
  })

  it('restarts the owner of each matching pod', async () => {
    mockDeps.getWorkloadKeyFromPod.mockReturnValueOnce('ns/deploy-a').mockReturnValueOnce('ns/deploy-b')
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({
      items: [{ metadata: { namespace: 'ns', name: 'pod-a' } }, { metadata: { namespace: 'ns', name: 'pod-b' } }],
    })

    await restartPlatformAuthPods(mockCoreApi, mockDeps)

    expect(mockDeps.restartPodOwner).toHaveBeenCalledTimes(2)
  })

  it('restarts each distinct workload only once', async () => {
    mockDeps.getWorkloadKeyFromPod.mockReturnValue('ns/deploy-a')
    mockCoreApi.listPodForAllNamespaces.mockResolvedValue({
      items: [{ metadata: { namespace: 'ns', name: 'pod-a-1' } }, { metadata: { namespace: 'ns', name: 'pod-a-2' } }],
    })

    await restartPlatformAuthPods(mockCoreApi, mockDeps)

    expect(mockDeps.restartPodOwner).toHaveBeenCalledTimes(1)
  })
})
