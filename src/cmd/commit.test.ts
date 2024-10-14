import { AppsV1Api } from '@kubernetes/client-node'
import { jest } from '@jest/globals'
import { terminal } from '../common/debug'
import { isOAuth2ProxyRunning } from './commit'
import { mock } from 'jest-mock-extended'

jest.mock('../common/debug')

describe('isOAuth2ProxyRunning', () => {
  const mockAppsV1Api = mock<AppsV1Api>()
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
    // @ts-ignore
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({ body: null })

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).rejects.toThrow('OAuth2 Proxy deployment not found, waiting...')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2 Proxy deployment has no status', async () => {
    // @ts-ignore
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({ body: { status: null } })

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).rejects.toThrow('OAuth2 Proxy has no status, waiting...')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should throw an error if the OAuth2 Proxy deployment has no ready replicas', async () => {
    // @ts-ignore
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({ body: { status: { availableReplicas: 0 } } })

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).rejects.toThrow('OAuth2 Proxy has no ready replicas, waiting...')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })

  it('should log success if the OAuth2 Proxy deployment is running', async () => {
    // @ts-ignore
    mockAppsV1Api.readNamespacedDeployment.mockResolvedValue({ body: { status: { availableReplicas: 1 } } })

    await expect(isOAuth2ProxyRunning(mockAppsV1Api)).resolves.toBeUndefined()

    expect(mockTerminalInfo).toHaveBeenCalledWith('OAuth2 Proxy deployment is running, continuing...')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockAppsV1Api.readNamespacedDeployment).toHaveBeenCalledWith('oauth2-proxy', 'istio-system')
  })
})
