import {
  Configuration,
  createConfiguration,
  HttpLibrary,
  IsomorphicFetchHttpLibrary,
  KubeConfig,
  Observable,
  ServerConfiguration,
} from '@kubernetes/client-node'
import { terminal } from './debug'

let requestId = 0
let kubeConfig: KubeConfig

export function getKubeConfig(): KubeConfig {
  if (!kubeConfig) {
    kubeConfig = new KubeConfig()
    kubeConfig.loadFromDefault()
  }
  return kubeConfig
}

export function loggingHttpApi(transport: HttpLibrary = new IsomorphicFetchHttpLibrary()): HttpLibrary {
  const d = terminal('common:k8s:http')
  return {
    send(request) {
      requestId += 1
      const id = requestId
      const started = performance.now()
      const operation = `${request.getHttpMethod()} ${new URL(request.getUrl()).pathname}`
      d.debug(`[${id}] ${operation} started`)
      const result = (async () => {
        try {
          const response = await transport.send(request).toPromise()
          d.debug(
            `[${id}] ${operation} response headers received: ${response.httpStatusCode} (${Math.round(performance.now() - started)}ms)`,
          )
          return response
        } catch (error) {
          // Transport errors can contain URLs or credentials; log only the error type.
          d.debug(
            `[${id}] ${operation} failed: ${error instanceof Error ? error.name : 'Unknown error'} (${Math.round(performance.now() - started)}ms)`,
          )
          throw error
        }
      })()
      return new Observable(result)
    },
  }
}

// Warning don't use this with asynchronous code and multiple kubeconfigs it will override the kubeconfig
export function makeK8sApiClient<T>(apiClientType: new (config: Configuration) => T): T {
  const kc = getKubeConfig()
  const cluster = kc.getCurrentCluster()
  if (!cluster) throw new Error('No active cluster!')
  return new apiClientType(
    createConfiguration({
      baseServer: new ServerConfiguration(cluster.server, {}),
      authMethods: { default: kc },
      httpApi: loggingHttpApi(),
    }),
  )
}
