/* eslint-disable @typescript-eslint/unbound-method */
import { CoreV1Api } from '@kubernetes/client-node'
import { terminal } from '../common/debug'
import { isOAuth2ProxyAvailable } from './commit'

jest.mock('../common/debug')
jest.mock('@kubernetes/client-node')

describe('isOAuth2ProxyRunning', () => {
  const mockCoreV1Api = new CoreV1Api() as jest.Mocked<CoreV1Api>
  const mockTerminal = terminal as jest.MockedFunction<typeof terminal>

  const mockTerminalInfo = jest.fn()

  beforeEach(() => {
    mockTerminal.mockReturnValue({
      info: mockTerminalInfo,
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should throw an error if the OAuth2Proxy endpoint is not found', async () => {
    mockCoreV1Api.readNamespacedEndpoints.mockResolvedValue({ body: null } as any)

    await expect(isOAuth2ProxyAvailable(mockCoreV1Api)).rejects.toThrow('OAuth2Proxy endpoint not found, waiting...')
    expect(mockCoreV1Api.readNamespacedEndpoints).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2Proxy endpoint has no subsets', async () => {
    mockCoreV1Api.readNamespacedEndpoints.mockResolvedValue({
      body: {
        subsets: null,
      },
    } as any)

    await expect(isOAuth2ProxyAvailable(mockCoreV1Api)).rejects.toThrow('OAuth2Proxy has no subsets, waiting...')
    expect(mockCoreV1Api.readNamespacedEndpoints).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2Proxy endpoint has empty subsets array', async () => {
    mockCoreV1Api.readNamespacedEndpoints.mockResolvedValue({
      body: {
        subsets: [],
      },
    } as any)

    await expect(isOAuth2ProxyAvailable(mockCoreV1Api)).rejects.toThrow('OAuth2Proxy has no subsets, waiting...')
    expect(mockCoreV1Api.readNamespacedEndpoints).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2Proxy endpoint has only notReadyAddresses', async () => {
    mockCoreV1Api.readNamespacedEndpoints.mockResolvedValue({
      body: {
        subsets: [
          {
            notReadyAddresses: [
              {
                ip: '10.2.0.150',
                nodeName: 'lke247189-392457-0ec418ca0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-rm8h7',
                  namespace: 'istio-system',
                  uid: '1b9615c4-4513-48d9-8d25-3a357e601cda',
                },
              },
              {
                ip: '10.2.1.21',
                nodeName: 'lke247189-392457-60bc5d2d0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-j76dg',
                  namespace: 'istio-system',
                  uid: '1c13b51a-f76a-46b0-aaa1-03d96ba46945',
                },
              },
            ],
            ports: [
              {
                name: 'http',
                port: '4180',
                protocol: 'TCP',
              },
            ],
          },
        ],
      },
    } as any)

    await expect(isOAuth2ProxyAvailable(mockCoreV1Api)).rejects.toThrow(
      'OAuth2Proxy has no available addresses, waiting...',
    )
    expect(mockCoreV1Api.readNamespacedEndpoints).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2Proxy endpoint has empty addresses ', async () => {
    mockCoreV1Api.readNamespacedEndpoints.mockResolvedValue({
      body: {
        subsets: [
          {
            notReadyAddresses: [
              {
                ip: '10.2.0.150',
                nodeName: 'lke247189-392457-0ec418ca0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-rm8h7',
                  namespace: 'istio-system',
                  uid: '1b9615c4-4513-48d9-8d25-3a357e601cda',
                },
              },
              {
                ip: '10.2.1.21',
                nodeName: 'lke247189-392457-60bc5d2d0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-j76dg',
                  namespace: 'istio-system',
                  uid: '1c13b51a-f76a-46b0-aaa1-03d96ba46945',
                },
              },
            ],
            addresses: null,
            ports: [
              {
                name: 'http',
                port: '4180',
                protocol: 'TCP',
              },
            ],
          },
        ],
      },
    } as any)

    await expect(isOAuth2ProxyAvailable(mockCoreV1Api)).rejects.toThrow(
      'OAuth2Proxy has no available addresses, waiting...',
    )
    expect(mockCoreV1Api.readNamespacedEndpoints).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2Proxy endpoint has empty array of addresses', async () => {
    mockCoreV1Api.readNamespacedEndpoints.mockResolvedValue({
      body: {
        subsets: [
          {
            notReadyAddresses: [
              {
                ip: '10.2.0.150',
                nodeName: 'lke247189-392457-0ec418ca0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-rm8h7',
                  namespace: 'istio-system',
                  uid: '1b9615c4-4513-48d9-8d25-3a357e601cda',
                },
              },
              {
                ip: '10.2.1.21',
                nodeName: 'lke247189-392457-60bc5d2d0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-j76dg',
                  namespace: 'istio-system',
                  uid: '1c13b51a-f76a-46b0-aaa1-03d96ba46945',
                },
              },
            ],
            addresses: [],
            ports: [
              {
                name: 'http',
                port: '4180',
                protocol: 'TCP',
              },
            ],
          },
        ],
      },
    } as any)

    await expect(isOAuth2ProxyAvailable(mockCoreV1Api)).rejects.toThrow(
      'OAuth2Proxy has no available addresses, waiting...',
    )
    expect(mockCoreV1Api.readNamespacedEndpoints).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should log success if OAuth2Proxy endpoint has addresses', async () => {
    mockCoreV1Api.readNamespacedEndpoints.mockResolvedValue({
      body: {
        subsets: [
          {
            addresses: [
              {
                ip: '127.0.0.1',
                nodeName: 'lke247189-392457-0ec418ca0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-rm8h7',
                  namespace: 'istio-system',
                  uid: '1b9615c4-4513-48d9-8d25-3a357e601cda',
                },
              },
              {
                ip: '127.0.0.2',
                nodeName: 'lke247189-392457-60bc5d2d0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-j76dg',
                  namespace: 'istio-system',
                  uid: '1c13b51a-f76a-46b0-aaa1-03d96ba46945',
                },
              },
            ],
            ports: [
              {
                name: 'http',
                port: '4180',
                protocol: 'TCP',
              },
            ],
          },
        ],
      },
    } as any)

    await expect(isOAuth2ProxyAvailable(mockCoreV1Api)).resolves.toBeUndefined()

    expect(mockTerminalInfo).toHaveBeenCalledWith('OAuth2proxy is available, continuing...')
    expect(mockCoreV1Api.readNamespacedEndpoints).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should log success if OAuth2Proxy endpoint has addresses and notReadyAddresses', async () => {
    mockCoreV1Api.readNamespacedEndpoints.mockResolvedValue({
      body: {
        subsets: [
          {
            notReadyAddresses: [
              {
                ip: '10.2.0.150',
                nodeName: 'lke247189-392457-0ec418ca0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-rm8h7',
                  namespace: 'istio-system',
                  uid: '1b9615c4-4513-48d9-8d25-3a357e601cda',
                },
              },
              {
                ip: '10.2.1.21',
                nodeName: 'lke247189-392457-60bc5d2d0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-j76dg',
                  namespace: 'istio-system',
                  uid: '1c13b51a-f76a-46b0-aaa1-03d96ba46945',
                },
              },
            ],
            addresses: [
              {
                ip: '127.0.0.1',
                nodeName: 'lke247189-392457-0ec418ca0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-rm8h7',
                  namespace: 'istio-system',
                  uid: '1b9615c4-4513-48d9-8d25-3a357e601cda',
                },
              },
              {
                ip: '127.0.0.2',
                nodeName: 'lke247189-392457-60bc5d2d0000',
                targetRef: {
                  kind: 'Pod',
                  name: 'oauth2-proxy-6cff6bcb4b-j76dg',
                  namespace: 'istio-system',
                  uid: '1c13b51a-f76a-46b0-aaa1-03d96ba46945',
                },
              },
            ],
            ports: [
              {
                name: 'http',
                port: '4180',
                protocol: 'TCP',
              },
            ],
          },
        ],
      },
    } as any)

    await expect(isOAuth2ProxyAvailable(mockCoreV1Api)).resolves.toBeUndefined()

    expect(mockTerminalInfo).toHaveBeenCalledWith('OAuth2proxy is available, continuing...')
    expect(mockCoreV1Api.readNamespacedEndpoints).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })
})
