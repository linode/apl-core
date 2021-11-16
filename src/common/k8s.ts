import { CoreV1Api, KubeConfig } from '@kubernetes/client-node'

let apiClient: CoreV1Api

export function getApiClient(): CoreV1Api {
  if (apiClient) return apiClient
  const kc = new KubeConfig()
  kc.loadFromDefault()
  apiClient = kc.makeApiClient(CoreV1Api)
  return apiClient
}
