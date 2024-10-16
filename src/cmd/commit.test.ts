/* eslint-disable @typescript-eslint/unbound-method */
import { AppsV1Api } from '@kubernetes/client-node'
import { terminal } from '../common/debug'
import { isOAuth2ProxyRunning } from './commit'

jest.mock('../common/debug')
jest.mock('@kubernetes/client-node')

describe('isOAuth2ProxyRunning', () => {
  const mockAppsV1Api = new AppsV1Api() as jest.Mocked<AppsV1Api>
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

  it('should throw an error if the OAuth2 Proxy deployment is not found', async () => {
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({ body: null } as any)

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).rejects.toThrow('OAuth2 Proxy deployment not found, waiting...')
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2 Proxy deployment has no status', async () => {
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({ body: { status: null } } as any)

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).rejects.toThrow('OAuth2 Proxy has no status, waiting...')
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2 Proxy deployment has availableReplicas 0', async () => {
    // @ts-ignore
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({ body: { status: { availableReplicas: 0 } } })

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).rejects.toThrow(
      'OAuth2 Proxy has no available replicas, waiting...',
    )
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2 Proxy deployment has no availableReplicas', async () => {
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({ body: { status: { replicas: 1 } } } as any)

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).rejects.toThrow(
      'OAuth2 Proxy has no available replicas, waiting...',
    )
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2 Proxy deployment has only unavailableReplicas', async () => {
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({
      body: { status: { replicas: 1, unavailableReplicas: 1 } },
    } as any)

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).rejects.toThrow(
      'OAuth2 Proxy has no available replicas, waiting...',
    )
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should log success if OAuth2 Proxy deployment has one availableReplicas and one unavailableReplicas', async () => {
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({
      body: { status: { replicas: 2, unavailableReplicas: 1, availableReplicas: 1 } },
    } as any)

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).resolves.toBeUndefined()

    expect(mockTerminalInfo).toHaveBeenCalledWith('OAuth2proxy is running, continuing...')
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should log success if the OAuth2 Proxy deployment is running', async () => {
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({
      body: { status: { replicas: 1, availableReplicas: 1 } },
    } as any)

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).resolves.toBeUndefined()

    expect(mockTerminalInfo).toHaveBeenCalledWith('OAuth2proxy is running, continuing...')
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })
})
