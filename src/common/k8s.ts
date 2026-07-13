import {
  ApiException,
  AppsV1Api,
  BatchV1Api,
  CoreV1Api,
  CustomObjectsApi,
  DiscoveryV1Api,
  Exec,
  KubeConfig,
  KubernetesObjectApi,
  NetworkingV1Api,
  PatchStrategy,
  setHeaderOptions,
  V1ConfigMap,
  V1ResourceRequirements,
  V1Secret,
  V1Status,
} from '@kubernetes/client-node'
import retry, { Options } from 'async-retry'
import { X509Certificate } from 'crypto'
import { access, mkdir, writeFile } from 'fs/promises'
import { get, isEqual, map, mapValues } from 'lodash'
import { dirname, join } from 'path'
import { Writable } from 'stream'
import { parse, stringify } from 'yaml'
import { $ } from 'zx'
import {
  ARGOCD_APP_DEFAULT_SYNC_POLICY,
  ARGOCD_APP_PARAMS,
  DEPLOYMENT_PASSWORDS_SECRET,
  DEPLOYMENT_STATUS_CONFIGMAP,
} from './constants'
import { OtomiDebugger, terminal } from './debug'
import { env } from './envalid'

export const secretId = `secret/otomi/${DEPLOYMENT_PASSWORDS_SECRET}`

// Warning don't use this with asynchronous code and multiple kubeconfigs it will override the kubeconfig
let kc: KubeConfig
let coreClient: CoreV1Api
let appClient: AppsV1Api
let batchClient: BatchV1Api
let networkingClient: NetworkingV1Api
let customClient: CustomObjectsApi
let discoveryClient: DiscoveryV1Api
let objectClient: KubernetesObjectApi
let execObject: Exec
export const k8s = {
  kc: (): KubeConfig => {
    if (kc) return kc
    kc = new KubeConfig()
    kc.loadFromDefault()
    return kc
  },
  core: (): CoreV1Api => {
    if (coreClient) return coreClient
    coreClient = k8s.kc().makeApiClient(CoreV1Api)
    return coreClient
  },
  app: (): AppsV1Api => {
    if (appClient) return appClient
    appClient = k8s.kc().makeApiClient(AppsV1Api)
    return appClient
  },
  batch: (): BatchV1Api => {
    if (batchClient) return batchClient
    batchClient = k8s.kc().makeApiClient(BatchV1Api)
    return batchClient
  },
  networking: (): NetworkingV1Api => {
    if (networkingClient) return networkingClient
    networkingClient = k8s.kc().makeApiClient(NetworkingV1Api)
    return networkingClient
  },
  discovery: (): DiscoveryV1Api => {
    if (discoveryClient) return discoveryClient
    discoveryClient = k8s.kc().makeApiClient(DiscoveryV1Api)
    return discoveryClient
  },
  custom: (): CustomObjectsApi => {
    if (customClient) return customClient
    customClient = k8s.kc().makeApiClient(CustomObjectsApi)
    return customClient
  },
  object: (): KubernetesObjectApi => {
    if (objectClient) return objectClient
    objectClient = k8s.kc().makeApiClient(KubernetesObjectApi)
    return objectClient
  },
}

export const createK8sSecret = async (
  name: string,
  namespace: string,
  data: Record<string, any> | string,
): Promise<void> => {
  const d = terminal('common:k8s:createK8sSecret')
  const rawString = stringify(data)
  const filePath = join('/tmp', secretId)
  const dirPath = dirname(filePath)
  try {
    await access(dirPath)
  } catch (e) {
    await mkdir(dirPath, { recursive: true })
  }

  await writeFile(filePath, rawString)
  const result =
    await $`kubectl create secret generic ${name} -n ${namespace} --from-file ${filePath} --dry-run=client -o yaml | kubectl apply -f -`
      .nothrow()
      .quiet()
  if (result.stderr) d.error(result.stderr)
  d.debug(`kubectl create secret output: \n ${result.stdout}`)
}

export const isResourcePresent = async (type: string, name: string, namespace: string): Promise<boolean> => {
  try {
    await $`kubectl get -n ${namespace} ${type} ${name}`
  } catch {
    return false
  }
  return true
}

export const getK8sSecret = async (
  name: string,
  namespace: string,
  parseValues = false,
): Promise<Record<string, any> | undefined> => {
  try {
    const secret = await k8s.core().readNamespacedSecret({ name, namespace })

    if (!secret?.data) {
      return undefined
    }

    // Decode all base64-encoded values and combine into a single object
    const decodedData: Record<string, any> = {}
    for (const [key, value] of Object.entries(secret.data)) {
      const decoded = Buffer.from(value, 'base64').toString('utf-8')
      // Optionally parse as YAML/JSON, otherwise use as string
      if (parseValues) {
        decodedData[key] = parse(decoded)
      } else {
        decodedData[key] = decoded
      }
    }

    return decodedData
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      return undefined
    }
    throw error
  }
}

export const deleteSecretForHelmRelease = async (releaseName: string, namespace: string, revision = 1) => {
  const d = terminal('common:k8s:deleteSecretForHelmRelease')
  d.info(`Deleting secret for Helm release ${releaseName} revision ${revision} in namespace ${namespace}`)
  try {
    await coreClient.deleteNamespacedSecret({ name: `sh.helm.release.v1.${releaseName}.v${revision}`, namespace })
    d.debug(`Deleted secret for Helm release ${releaseName} revision ${revision} in namespace ${namespace}`)
  } catch (error) {
    if (!(error instanceof ApiException && error.code === 404)) {
      throw error
    }
  }
}

export interface DeploymentState {
  status?: 'deploying' | 'deployed'
  tag?: string
  // semantic version string (without 'v' prefix)
  version?: string
  // container image tag (can be an arbitrary name)
  deployingTag?: string
  // semantic version string (without 'v' prefix)
  deployingVersion?: string
}

export const getDeploymentState = async (): Promise<DeploymentState> => {
  if (env.isDev && env.DISABLE_SYNC) return {}
  const result = await $`kubectl get cm -n otomi ${DEPLOYMENT_STATUS_CONFIGMAP} -o jsonpath='{.data}'`.nothrow().quiet()
  return JSON.parse(result.stdout || '{}')
}
interface HelmRelease {
  name: string
  labelName: string
  namespace: string
  status: string
  app_version: string
  revision: number
  first_deployed: Date | undefined | string
  last_deployed: Date | undefined | string
  chart?: string
}

export const deletePendingHelmReleases = async (): Promise<void> => {
  const d = terminal(`common:k8s:deletePendingHelmReleases`)
  const pendingHelmReleases = await getPendingHelmReleases()
  if (pendingHelmReleases.length > 0) {
    d.info(
      `Pending Helm operations detected for releases: ${pendingHelmReleases.map((r) => `${r.namespace}/${r.name}:v${r.revision}`).join(', ')}. removing secrets...`,
    )
    for (const release of pendingHelmReleases) {
      await deleteSecretForHelmRelease(release.name, release.namespace, release.revision)
    }
  }
}

export const getPendingHelmReleases = async (): Promise<HelmRelease[]> => {
  const d = terminal('common:k8s:getPendingHelmReleases')
  d.info('Checking for pending Helm operations')
  const releases = await getK8sHelmReleases()
  const pendingReleases: HelmRelease[] = []
  Object.keys(releases).forEach((key) => {
    const release = releases[key]
    if (release.labelName === 'apl' || release.labelName === 'otomi') return
    if (
      release.status === 'pending-upgrade' ||
      release.status === 'pending-install' ||
      release.status === 'pending-rollback'
    ) {
      pendingReleases.push(release)
    }
  })
  return pendingReleases
}

/**
 * Result of command execution
 */
export interface ExecResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function exec(
  namespace: string,
  podName: string,
  containerName: string,
  command: string[],
  timeout: number = 30000,
): Promise<ExecResult> {
  const execApi = new Exec(k8s.kc())

  let stdout = ''
  let stderr = ''
  let exitCode = 0

  const outputWritable = new Writable({
    write: (chunk: Buffer, encoding: string, callback: () => void) => {
      stdout += chunk.toString()
      callback()
    },
  })

  const errorWritable = new Writable({
    write: (chunk: Buffer, encoding: string, callback: () => void) => {
      stderr += chunk.toString()
      callback()
    },
  })

  const ws = await execApi.exec(
    namespace,
    podName,
    containerName,
    command,
    outputWritable,
    errorWritable,
    null,
    false,
    (status: V1Status) => {
      if (status.status === 'Failure') {
        exitCode = 1
        for (const cause of status.details?.causes || []) {
          if (cause.reason === 'ExitCode') {
            exitCode = parseInt(cause.message || '1')
            break
          }
        }
      }
    },
  )
  await new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Exec command timed out')), timeout)
    ws.once('close', resolve)
    ws.once('error', reject)
  })
  return { stdout, stderr, exitCode }
}

export const getHelmReleases = async (): Promise<Record<string, any>> => {
  const result = await $`helm list -A -a -o json`.nothrow().quiet()
  const data = JSON.parse(result.stdout || '[]') as []
  const status = data.reduce((acc, item) => {
    // eslint-disable-next-line no-param-reassign
    acc[`${item['namespace']}/${item['name']}`] = item
    return acc
  }, {})
  return status
}

export const getK8sHelmReleases = async (): Promise<Record<string, HelmRelease>> => {
  const coreApi = k8s.core()

  try {
    const secretsResponse = await coreApi.listSecretForAllNamespaces({
      labelSelector: 'owner=helm,status',
    })

    const releases: Record<string, HelmRelease> = {}

    for (const secret of secretsResponse.items) {
      if (!secret.metadata?.name || !secret.metadata?.namespace || !secret.metadata?.labels) continue

      const match = secret.metadata.name.match(/^sh\.helm\.release\.v1\.(.+)\.v(\d+)$/)
      if (!match) continue

      const [, releaseName, revision] = match
      const releaseKey = `${secret.metadata.namespace}/${releaseName}`

      const release: HelmRelease = {
        name: releaseName,
        labelName: secret.metadata.labels.name,
        namespace: secret.metadata.namespace,
        revision: parseInt(revision),
        status: secret.metadata.labels.status,
        app_version: secret.metadata.labels.version || secret.metadata.labels.app_version,
        chart: secret.metadata.labels.chart,
        first_deployed: secret.metadata?.creationTimestamp,
        last_deployed: secret.metadata?.labels.modifiedAt,
      }

      // Keep only the latest revision for each release
      if (!releases[releaseKey] || releases[releaseKey].revision < release.revision) {
        releases[releaseKey] = release
      }
    }

    return releases
  } catch (error) {
    throw new Error(`Failed to get Helm releases from Kubernetes: ${error.message}`)
  }
}

export async function ensureK8sDeploymentSync(appApi: AppsV1Api, appName: string): Promise<void> {
  // Due to update of the immutable Deployment field (.spec.strategy)
  const d = terminal('ensureK8sDeploymentSync')

  let syncResources: Array<{
    group?: string
    kind?: string
    name?: string
    status?: string
    namespace?: string
  }> = []

  try {
    const response = await k8s.custom().getNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      name: appName,
    })
    const argoApp = response.body as any

    syncResources = argoApp?.status?.operationState?.syncResult?.resources || []
  } catch (error) {
    d.info(`Skipping deployment deletion for app ${appName}: could not read Argo CD application sync status`)
    d.debug('Argo CD application status read error:', error)
    return
  }

  const deploymentTargets = syncResources.filter(
    (resource) =>
      resource.group === 'apps' &&
      resource.kind === 'Deployment' &&
      resource?.status === 'SyncFailed' &&
      resource.name &&
      resource.namespace,
  )

  if (deploymentTargets.length === 0) {
  d.info(`Skipping deployment deletion for app ${appName}: no SyncFailed deployment resources found in Argo CD sync status`)
    return
  }

  const uniqueTargets = Array.from(
    new Map(deploymentTargets.map((resource) => [`${resource.namespace}/${resource.name}`, resource])).values(),
  )

  for (const resource of uniqueTargets) {
    const { name, namespace } = resource
    if (!name || !namespace) continue

    try {
      d.info(`Deleting deployment ${name} in namespace ${namespace} (from Argo CD app ${appName} sync status)`)
      await appApi.deleteNamespacedDeployment({ name, namespace })
    } catch (error) {
      d.error(`Error deleting deployment ${name} in namespace ${namespace}:`, error)
    }
  }
}

export const setDeploymentState = async (state: Record<string, any>): Promise<void> => {
  if (env.isDev && env.DISABLE_SYNC) return
  const d = terminal('common:k8s:setDeploymentState')
  const currentState = await getDeploymentState()
  const newState = { ...currentState, ...state }
  const data = map(newState, (val, prop) => `--from-literal=${prop}=${val}`)
  const cmdCreate = `kubectl -n otomi create cm ${DEPLOYMENT_STATUS_CONFIGMAP} ${data.join(' ')}`
  const cmdPatch = `kubectl -n otomi patch cm ${DEPLOYMENT_STATUS_CONFIGMAP} --type merge -p {"data":${JSON.stringify(
    newState,
  )}}`
  const res = await $`${cmdPatch.split(' ')} || ${cmdCreate.split(' ')}`.nothrow().quiet()
  if (res.stderr) d.error(res.stderr)
}

type WaitTillAvailableOptions = Options & {
  status?: number
  skipSsl?: boolean
  username?: string
  password?: string
}

export const waitTillAvailable = async (url: string, opts?: WaitTillAvailableOptions): Promise<void> => {
  const options = { status: 200, skipSsl: false, ...opts }
  const d = terminal('common:k8s:waitTillAvailable')
  const retryOptions: Options = {
    retries: 50,
    maxTimeout: 30000,
  }

  // NOTE: Native fetch does not allow a custom 'agent' or direct 'timeout'.
  // If you need special TLS handling, rely on environment variables
  // like NODE_TLS_REJECT_UNAUTHORIZED or NODE_EXTRA_CA_CERTS.
  const fetchOptions: RequestInit = {
    redirect: 'follow',
  }
  if (options.username && options.password) {
    fetchOptions.headers = {
      Authorization: `Basic ${Buffer.from(`${options.username}:${options.password}`).toString('base64')}`,
    }
  }

  await retry(async (bail) => {
    try {
      const res = await fetch(url, fetchOptions)
      if (res.status !== options.status) {
        console.warn(`GET ${url} ${res.status} !== ${options.status}`)
        const err = new Error(`Wrong status code: ${res.status}`)
        // if we get a 404 or 503 we know some changes in either nginx or istio might still not be ready
        if (res.status !== 404 && res.status !== 503) {
          // but any other status code that is not the desired one tells us to stop retrying
          bail(err)
        } else throw err
      }
    } catch (e) {
      d.error(`GET ${url}`, e)
      throw e
    }
  }, retryOptions)
}

export async function createUpdateGenericSecret(
  coreV1Api: CoreV1Api,
  name: string,
  namespace: string,
  secretData: Record<string, string>,
  patch = true,
): Promise<V1Secret> {
  const encodedData = mapValues(secretData, b64enc)

  const secret: V1Secret = {
    metadata: {
      name,
      namespace,
    },
    data: encodedData,
    type: 'Opaque',
  }

  try {
    return await coreV1Api.createNamespacedSecret({ namespace, body: secret })
  } catch (error) {
    if (error instanceof ApiException && error.code === 409) {
      if (patch) {
        return await coreV1Api.patchNamespacedSecret(
          { name, namespace, body: secret },
          setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
        )
      } else {
        return await coreV1Api.replaceNamespacedSecret({ name, namespace, body: secret })
      }
    } else {
      throw error
    }
  }
}

export function b64enc(value: string): string {
  return Buffer.from(value).toString('base64')
}

export async function getK8sConfigMap(
  namespace: string,
  name: string,
  coreV1Api: CoreV1Api,
): Promise<V1ConfigMap | undefined> {
  try {
    return await coreV1Api.readNamespacedConfigMap({ name, namespace })
  } catch (error: any) {
    if (error.code === 404) {
      return undefined
    }
    throw error
  }
}

export async function createK8sConfigMap(
  namespace: string,
  name: string,
  data: Record<string, string>,
  coreV1Api: CoreV1Api,
): Promise<V1ConfigMap> {
  const configMap: V1ConfigMap = {
    metadata: {
      name,
      namespace,
    },
    data,
  }
  return await coreV1Api.createNamespacedConfigMap({ namespace, body: configMap })
}

export async function updateK8sConfigMap(
  namespace: string,
  name: string,
  data: Record<string, string>,
  coreV1Api: CoreV1Api,
): Promise<V1ConfigMap> {
  const configMap: V1ConfigMap = {
    metadata: {
      name,
      namespace,
    },
    data,
  }
  return await coreV1Api.replaceNamespacedConfigMap({ name, namespace, body: configMap })
}

export async function createUpdateConfigMap(
  coreV1Api: CoreV1Api,
  name: string,
  namespace: string,
  data: Record<string, string>,
): Promise<V1ConfigMap> {
  const configMap: V1ConfigMap = {
    metadata: {
      name,
      namespace,
    },
    data,
  }

  try {
    return await coreV1Api.createNamespacedConfigMap({ namespace, body: configMap })
  } catch (error) {
    if (error instanceof ApiException && error.code === 409) {
      return await coreV1Api.patchNamespacedConfigMap(
        { name, namespace, body: configMap },
        setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
      )
    } else {
      throw error
    }
  }
}

export async function getPodsOfDeployment(
  appsApi: AppsV1Api,
  coreApi: CoreV1Api,
  deploymentName: string,
  namespace: string,
) {
  const deployment = await appsApi.readNamespacedDeployment({ name: deploymentName, namespace })

  if (!deployment.spec?.selector?.matchLabels) {
    throw new Error(`Deployment ${deploymentName} does not have matchLabels`)
  }

  const labelSelector = Object.entries(deployment.spec.selector.matchLabels)
    .map(([key, value]) => `${key}=${value}`)
    .join(',')

  return await coreApi.listNamespacedPod({
    namespace,
    labelSelector,
  })
}

export async function getPodsOfStatefulSet(
  appsApi: AppsV1Api,
  statefulSetName: string,
  namespace: string,
  coreApi: CoreV1Api,
) {
  const statefulSet = await appsApi.readNamespacedStatefulSet({ name: statefulSetName, namespace })

  if (!statefulSet.spec?.selector?.matchLabels) {
    throw new Error(`StatefulSet ${statefulSetName} does not have matchLabels`)
  }

  const labelSelector = Object.entries(statefulSet.spec.selector.matchLabels)
    .map(([key, value]) => `${key}=${value}`)
    .join(',')

  return await coreApi.listNamespacedPod({
    namespace,
    labelSelector,
  })
}

export async function patchContainerResourcesOfSts(
  statefulSetName: string,
  namespace: string,
  containerName: string,
  desiredResources: V1ResourceRequirements,
  appsApi: AppsV1Api,
  coreApi: CoreV1Api,
  d: OtomiDebugger,
) {
  try {
    const pods = await getPodsOfStatefulSet(appsApi, statefulSetName, namespace, coreApi)

    if (pods.items.length === 0) {
      d.error(`No pods found for StatefulSet ${statefulSetName}`)
      throw new Error(`No pods found for StatefulSet ${statefulSetName}`)
    }

    for (const pod of pods.items) {
      const actualResources = pod.spec?.containers?.find((container) => container.name === containerName)?.resources

      if (
        isEqual(actualResources?.limits, desiredResources?.limits) &&
        isEqual(actualResources?.requests, desiredResources?.requests)
      ) {
        d.info(
          `sts/argocd-application-controller pod has desired resources: ${JSON.stringify(
            desiredResources,
          )} and actual resources: ${JSON.stringify(actualResources)}`,
        )
        return
      }

      await patchStatefulSetResources(statefulSetName, containerName, namespace, desiredResources, appsApi, d)
      d.info(`sts/argocd-application-controller has been patched with resources: ${JSON.stringify(desiredResources)}`)

      await deleteStatefulSetPods(statefulSetName, namespace, appsApi, coreApi, d)
      d.info(`sts/argocd-application-controller pods restarted`)
    }
  } catch (error) {
    d.error(`Error patching StatefulSet ${statefulSetName}:`, error)
  }
}

export async function patchStatefulSetResources(
  statefulSetName: string,
  containerName: string,
  namespace: string,
  resources: V1ResourceRequirements,
  appsApi: AppsV1Api,
  d: OtomiDebugger,
) {
  try {
    const body = {
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: containerName,
                resources,
              },
            ],
          },
        },
      },
    }

    await appsApi.patchNamespacedStatefulSet(
      {
        name: statefulSetName,
        namespace,
        body,
      },
      setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
    )
  } catch (error) {
    d.error(`Failed to patch StatefulSet ${statefulSetName}:`, error)
  }
}

export async function deleteStatefulSetPods(
  statefulSetName: string,
  namespace: string,
  appsApi: AppsV1Api,
  coreApi: CoreV1Api,
  d: OtomiDebugger,
) {
  try {
    const pods = await getPodsOfStatefulSet(appsApi, statefulSetName, namespace, coreApi)

    if (pods.items.length === 0) {
      d.error(`No pods found for StatefulSet ${statefulSetName}`)
      throw new Error(`No pods found for StatefulSet ${statefulSetName}`)
    }

    // Delete each pod
    for (const pod of pods.items) {
      if (pod.metadata?.name) {
        await coreApi.deleteNamespacedPod({ name: pod.metadata.name, namespace })
      }
    }
  } catch (error) {
    d.error(`Failed to delete pods for StatefulSet ${statefulSetName}:`, error)
  }
}

// Core logic functions that can be easily tested
export async function checkArgoCDAppStatus(
  appName: string,
  customApi: CustomObjectsApi,
  statusPath: 'sync' | 'health',
  expectedValue: 'Synced' | 'Healthy',
): Promise<string> {
  const application = await customApi.getNamespacedCustomObject({
    ...ARGOCD_APP_PARAMS,
    name: appName,
  })

  const actualStatus = statusPath === 'sync' ? application?.status?.sync?.status : application?.status?.health?.status

  if (actualStatus !== expectedValue) {
    throw new Error(`Application ${appName} ${statusPath} status is '${actualStatus}', expected '${expectedValue}'`)
  }

  return actualStatus
}

export async function waitForArgoCDAppSync(
  appName: string,
  customApi: CustomObjectsApi,
  d: OtomiDebugger,
): Promise<void> {
  d.info(`Waiting for ArgoCD application '${appName}' to complete sync...`)

  await retry(
    async () => {
      try {
        await checkArgoCDAppStatus(appName, customApi, 'sync', 'Synced')
        d.info(`Application '${appName}' sync completed`)
      } catch (error) {
        d.warn(`Application '${appName}' is not synced yet: ${error.message}`)
        throw error
      }
    },
    { retries: env.RETRIES, randomize: env.RANDOM, minTimeout: env.MIN_TIMEOUT, factor: env.FACTOR },
  )
}

export async function waitForArgoCDAppHealthy(
  appName: string,
  customApi: CustomObjectsApi,
  d: OtomiDebugger,
): Promise<void> {
  d.info(`Waiting for ArgoCD application '${appName}' to be healthy...`)

  await retry(
    async () => {
      try {
        await checkArgoCDAppStatus(appName, customApi, 'health', 'Healthy')
        d.info(`Application '${appName}' is healthy`)
      } catch (error) {
        d.warn(`Application '${appName}' is not healthy yet: ${error.message}`)
        throw error
      }
    },
    { retries: env.RETRIES, randomize: env.RANDOM, minTimeout: env.MIN_TIMEOUT, factor: env.FACTOR },
  )
}

export function argoCdHasUnrecoverableErrors(applications: Record<string, any>[]): string | undefined {
  for (const application of applications) {
    const operationState = application.status?.operationState
    if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ['Failed', 'Error'].includes(operationState?.phase) &&
      operationState?.message === 'runtime error: invalid memory address or nil pointer dereference'
    ) {
      return application?.metadata?.name || 'unknown'
    }
  }
  return undefined
}

export async function appRevisionMatches(appName: string, expectedRevision: string, customApi: CustomObjectsApi) {
  const application = await customApi.getNamespacedCustomObject({
    ...ARGOCD_APP_PARAMS,
    name: appName,
  })
  const targetRevision = application?.spec?.source?.targetRevision
  return expectedRevision === targetRevision
}

export async function patchArgoCdApp(
  appName: string,
  targetRevision: string,
  values: string,
  customApi: CustomObjectsApi,
) {
  return await customApi.patchNamespacedCustomObject({
    ...ARGOCD_APP_PARAMS,
    name: appName,
    body: [
      { op: 'replace', path: '/spec/source/targetRevision', value: targetRevision },
      { op: 'replace', path: '/spec/source/helm/values', value: values },
    ],
  })
}

export async function getArgoCdApp(appName: string, customApi: CustomObjectsApi) {
  try {
    const app = await customApi.getNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      name: appName,
    })
    return app
  } catch (error) {
    if (error?.code === 404) {
      return undefined
    }
    throw error
  }
}

export async function setArgoCdAppSync(
  appName: string,
  enabled: boolean,
  customApi: CustomObjectsApi,
  syncOptions: string[] = ['ServerSideApply=true'],
) {
  const syncPolicy = {
    ...ARGOCD_APP_DEFAULT_SYNC_POLICY,
    syncOptions,
  }
  const patch = [
    enabled
      ? {
          op: 'replace',
          path: '/spec/syncPolicy',
          value: syncPolicy,
        }
      : { op: 'replace', path: '/spec/syncPolicy', value: { automated: null } },
  ]

  return await customApi.patchNamespacedCustomObject(
    {
      ...ARGOCD_APP_PARAMS,
      name: appName,
      body: patch,
    },
    setHeaderOptions('Content-Type', PatchStrategy.JsonPatch),
  )
}

export const createArgoCdRedisSecret = async (values: Record<string, any>): Promise<void> => {
  const d = terminal('common:k8s:createArgoCdRedisSecret')
  const argocdNamespace = 'argocd'
  const secretName = 'argocd-redis'
  const helmReleaseName = 'argocd-artifacts'
  const redisPassword = get(values, 'apps.argocd.redisPassword')

  if (typeof redisPassword !== 'string' || redisPassword.length === 0) {
    d.warn('apps.argocd.redisPassword is missing, skipping argocd-redis reconciliation')
    return
  }

  try {
    await k8s.object().patch(
      {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: argocdNamespace,
        },
      },
      undefined,
      undefined,
      'apl-operator',
      true,
      PatchStrategy.ServerSideApply,
    )
    d.info(`Patched with server-side apply ${argocdNamespace}`)
  } catch (error) {
    if (!(error instanceof ApiException && error.code === 409)) throw error
  }

  const secretBody = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: secretName,
      namespace: argocdNamespace,
      labels: {
        'app.kubernetes.io/managed-by': 'Helm',
      },
      annotations: {
        'meta.helm.sh/release-name': helmReleaseName,
        'meta.helm.sh/release-namespace': argocdNamespace,
      },
    },
    type: 'Opaque',
    stringData: {
      auth: redisPassword,
    },
  }

  try {
    await k8s.object().patch(secretBody, undefined, undefined, 'apl-operator', true, PatchStrategy.ServerSideApply)
    d.info(`Patched Secret ${secretName} in namespace ${argocdNamespace}`)
  } catch (error) {
    if (!(error instanceof ApiException && error.code === 409)) throw error
    d.error(`Failed to patch Secret ${secretName} with server-side apply:`, error)
    throw error
  }
}

export async function restartDeployment(name: string, namespace: string): Promise<void> {
  await k8s.app().patchNamespacedDeployment(
    {
      name,
      namespace,
      body: {
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
              },
            },
          },
        },
      },
    },
    setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
  )
}

export async function restartStatefulSet(name: string, namespace: string): Promise<void> {
  await k8s.app().patchNamespacedStatefulSet(
    {
      name,
      namespace,
      body: {
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
              },
            },
          },
        },
      },
    },
    setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
  )
}

export async function restartOtomiApiDeployment(appApi: AppsV1Api): Promise<void> {
  const d = terminal('common:k8s:restartOtomiApiDeployment')

  try {
    d.info('Restarting otomi-api deployment')
    // This is equivalent to the 'kubectl rollout restart' command/
    // Read more at: https://kubernetes.io/docs/reference/labels-annotations-taints/#kubectl-k8s-io-restart-at
    await appApi.patchNamespacedDeployment(
      {
        name: 'otomi-api',
        namespace: 'otomi',
        body: {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
                },
              },
            },
          },
        },
      },
      setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
    )

    d.info('Successfully restarted otomi-api deployment')
  } catch (error) {
    d.error('Failed to restart otomi-api deployment:', error)
    throw error
  }
}

export async function applyServerSide(
  path: string,
  forceConflicts: boolean = false,
  dryRun: boolean = false,
): Promise<void> {
  const d = terminal('common:k8s:applyServerSide')
  d.debug(`Applying files from ${path}`)
  const kubectlArgs = ['-f', path]
  if (dryRun) {
    kubectlArgs.push('--dry-run=client')
  } else {
    kubectlArgs.push('--server-side')
    if (forceConflicts) {
      kubectlArgs.push('--force-conflicts')
    }
  }
  await $`kubectl apply ${kubectlArgs}`
}

export async function waitForCRD(crdName: string, timeoutSeconds: number = 60): Promise<void> {
  const d = terminal('common:k8s:waitForCRD')
  d.debug(`Waiting for CRD ${crdName} to be established (timeout: ${timeoutSeconds}s)`)
  try {
    await $`kubectl wait --for condition=established --timeout=${timeoutSeconds}s crd/${crdName}`
    d.debug(`CRD ${crdName} is ready`)
  } catch (error) {
    d.error(`Failed to wait for CRD ${crdName}:`, error)
    throw error
  }
}

/**
 * Ensure a namespace exists. If it doesn't exist, create it with proper labels.
 * This avoids overwriting labels on existing namespaces that were created by k8s-raw.gotmpl.
 */
export const ensureNamespaceExists = async (namespace: string): Promise<void> => {
  const d = terminal(`common:k8s:ensureNamespaceExists`)

  try {
    await k8s.core().readNamespace({ name: namespace })
    d.debug(`Namespace ${namespace} already exists`)
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      d.info(`Creating namespace ${namespace}`)
      await k8s.core().createNamespace({
        body: {
          metadata: {
            name: namespace,
            labels: { name: namespace },
          },
        },
      })
    } else {
      throw error
    }
  }
}

export async function getSealedSecretsPEM(): Promise<string> {
  const d = terminal('common:k8s:getSealedSecretsPEM')
  const namespace = 'sealed-secrets'
  const labelSelector = 'sealedsecrets.bitnami.com/sealed-secrets-key'

  try {
    const response = await k8s.core().listNamespacedSecret({ namespace, labelSelector })
    const { items } = response

    if (!items || items.length === 0) {
      throw new Error('No sealed secrets keys found in the sealed-secrets namespace')
    }

    const newestItem = items.reduce((maxItem: V1Secret, currentItem: V1Secret) => {
      const maxTimestamp = new Date(maxItem.metadata?.creationTimestamp as Date).getTime()
      const currentTimestamp = new Date(currentItem.metadata?.creationTimestamp as Date).getTime()
      return currentTimestamp > maxTimestamp ? currentItem : maxItem
    }, items[0])

    if (!newestItem.data?.['tls.crt']) {
      throw new Error('Sealed secrets certificate not found in secret data')
    }

    const certificate = Buffer.from(newestItem.data['tls.crt'], 'base64').toString('utf-8')
    const x509 = new X509Certificate(certificate)
    const exported = x509.publicKey.export({ format: 'pem', type: 'spki' })
    return typeof exported === 'string' ? exported : exported.toString('utf-8')
  } catch (error) {
    d.error('Error fetching SealedSecrets PEM:', error)
    throw error
  }
}
