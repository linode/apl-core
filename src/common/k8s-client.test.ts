import { CoreV1Api, HttpMethod, KubeConfig, Observable, RequestContext, ResponseContext } from '@kubernetes/client-node'
import { terminal } from './debug'
import { getKubeConfig, loggingHttpApi, makeK8sApiClient } from './k8s-client'

jest.mock('./debug', () => ({
  terminal: jest.fn(() => ({ debug: jest.fn() })),
}))

describe('Kubernetes HTTP logging', () => {
  const request = new RequestContext('https://user:password@cluster/api/v1/secrets?token=private', HttpMethod.POST)
  request.setBody('secret payload')
  request.setHeaderParam('Authorization', 'Bearer private')

  beforeEach(() => jest.clearAllMocks())

  it('logs request start before resolution and correlates response without exposing secrets', async () => {
    let resolve!: (response: ResponseContext) => void
    const pending = new Promise<ResponseContext>((done) => {
      resolve = done
    })
    const send = jest.fn(() => new Observable(pending))
    const api = loggingHttpApi({ send })
    const result = api.send(request).toPromise()
    const log = jest.mocked(terminal).mock.results[0].value
    expect(log.debug).toHaveBeenCalledTimes(1)
    expect(log.debug.mock.calls[0][0]).toMatch(/^\[\d+\] POST \/api\/v1\/secrets started$/)
    const response = new ResponseContext(
      201,
      {},
      {
        text: async () => 'response secret',
        binary: async () => Buffer.from('response secret'),
      },
    )
    resolve(response)
    expect(await result).toBe(response)
    expect(send).toHaveBeenCalledWith(request)
    const [id] = log.debug.mock.calls[0][0].match(/^\[\d+\]/)!
    expect(log.debug.mock.calls[1][0]).toContain(`${id} POST /api/v1/secrets response headers received: 201`)
    expect(JSON.stringify(log.debug.mock.calls)).not.toMatch(/password|private|payload|response secret/)
  })

  it('logs transport rejection and rethrows the original error without logging its message', async () => {
    const error = new Error('https://user:password@cluster/?token=private')
    const api = loggingHttpApi({ send: () => new Observable(Promise.reject(error)) })
    await expect(api.send(request).toPromise()).rejects.toBe(error)
    const log = jest.mocked(terminal).mock.results[0].value
    expect(log.debug.mock.calls[1][0]).toMatch(/POST \/api\/v1\/secrets failed: Error/)
    expect(JSON.stringify(log.debug.mock.calls)).not.toMatch(/password|private/)
  })

  it('logs synchronous transport failures and preserves them', async () => {
    const error = new Error('transport failed')
    const api = loggingHttpApi({
      send: () => {
        throw error
      },
    })
    await expect(api.send(request).toPromise()).rejects.toBe(error)
    const log = jest.mocked(terminal).mock.results[0].value
    expect(log.debug).toHaveBeenCalledTimes(2)
  })

  it('creates a client with the current cluster and kubeconfig authentication', async () => {
    const load = jest.spyOn(KubeConfig.prototype, 'loadFromDefault').mockImplementation(() => {})
    const kc = getKubeConfig()
    expect(getKubeConfig()).toBe(kc)
    expect(load).toHaveBeenCalledTimes(1)
    load.mockRestore()
    kc.loadFromClusterAndUser(
      { name: 'cluster', server: 'https://cluster', skipTLSVerify: false },
      { name: 'user', token: 'private' },
    )
    expect(makeK8sApiClient(CoreV1Api)).toBeInstanceOf(CoreV1Api)
    const configuration = makeK8sApiClient(
      class {
        constructor(public config: import('@kubernetes/client-node').Configuration) {}
      },
    ).config
    expect(configuration.baseServer.makeRequestContext('/api', HttpMethod.GET).getUrl()).toBe('https://cluster/api')
    expect(configuration.authMethods.default).toBe(kc)
    expect(configuration.httpApi).toHaveProperty('send')
  })

  it('rejects missing active clusters', () => {
    const cluster = jest.spyOn(getKubeConfig(), 'getCurrentCluster').mockReturnValue(null)
    expect(() => makeK8sApiClient(CoreV1Api)).toThrow('No active cluster!')
    cluster.mockRestore()
  })
})
