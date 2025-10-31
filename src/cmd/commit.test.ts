import { DiscoveryV1Api } from '@kubernetes/client-node'
import { isOAuth2ProxyAvailable } from './commit'

jest.mock('../common/debug')
jest.mock('@kubernetes/client-node')

describe('isOAuth2ProxyRunning', () => {
  const mockDiscoveryV1Api = new DiscoveryV1Api({} as any) as jest.Mocked<DiscoveryV1Api>

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should throw an error if no EndpointSlices are found', async () => {
    mockDiscoveryV1Api.listNamespacedEndpointSlice.mockResolvedValue({
      items: [],
    } as any)

    await expect(isOAuth2ProxyAvailable(mockDiscoveryV1Api)).rejects.toThrow(
      'OAuth2Proxy EndpointSlice not found, waiting...',
    )
    expect(mockDiscoveryV1Api.listNamespacedEndpointSlice).toHaveBeenCalledWith({
      namespace: 'istio-system',
      labelSelector: 'kubernetes.io/service-name=oauth2-proxy',
    })
  })

  it('should throw an error if EndpointSlice has no endpoints', async () => {
    mockDiscoveryV1Api.listNamespacedEndpointSlice.mockResolvedValue({
      items: [
        {
          endpoints: [],
        },
      ],
    } as any)

    await expect(isOAuth2ProxyAvailable(mockDiscoveryV1Api)).rejects.toThrow(
      'OAuth2Proxy has no ready endpoints with addresses, waiting...',
    )
  })

  it('should throw an error if all endpoints are not ready', async () => {
    mockDiscoveryV1Api.listNamespacedEndpointSlice.mockResolvedValue({
      items: [
        {
          endpoints: [
            {
              addresses: ['10.2.0.150'],
              conditions: {
                ready: false,
                serving: false,
                terminating: false,
              },
            },
          ],
        },
      ],
    } as any)

    await expect(isOAuth2ProxyAvailable(mockDiscoveryV1Api)).rejects.toThrow(
      'OAuth2Proxy has no ready endpoints with addresses, waiting...',
    )
  })

  it('should throw an error if endpoints have no addresses', async () => {
    mockDiscoveryV1Api.listNamespacedEndpointSlice.mockResolvedValue({
      items: [
        {
          endpoints: [
            {
              addresses: [],
              conditions: {
                ready: true,
                serving: true,
                terminating: false,
              },
            },
          ],
        },
      ],
    } as any)

    await expect(isOAuth2ProxyAvailable(mockDiscoveryV1Api)).rejects.toThrow(
      'OAuth2Proxy has no ready endpoints with addresses, waiting...',
    )
  })

  it('should succeed when at least one endpoint is ready with addresses', async () => {
    mockDiscoveryV1Api.listNamespacedEndpointSlice.mockResolvedValue({
      items: [
        {
          endpoints: [
            {
              addresses: ['10.2.0.150'],
              conditions: {
                ready: true,
                serving: true,
                terminating: false,
              },
            },
          ],
        },
      ],
    } as any)

    await expect(isOAuth2ProxyAvailable(mockDiscoveryV1Api)).resolves.toBeUndefined()
  })
})
