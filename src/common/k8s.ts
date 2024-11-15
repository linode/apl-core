/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
import retry, { Options } from 'async-retry'
import { AnyAaaaRecord, AnyARecord } from 'dns'
import { resolveAny } from 'dns/promises'
import { access, mkdir, writeFile } from 'fs/promises'
import { Agent } from 'https'
import { isEmpty, map, mapValues } from 'lodash'
import fetch, { RequestInit } from 'node-fetch'
import { dirname, join } from 'path'
import { parse, stringify } from 'yaml'
import { $, cd, nothrow, sleep } from 'zx'
import { DEPLOYMENT_PASSWORDS_SECRET, DEPLOYMENT_STATUS_CONFIGMAP } from './constants'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import { parser } from './yargs'
import { askYesNo } from './zx-enhance'
import { AppsV1Api, CoreV1Api, V1Secret } from '@kubernetes/client-node'

export const secretId = `secret/otomi/${DEPLOYMENT_PASSWORDS_SECRET}`

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
  const result = await nothrow(
    $`kubectl create secret generic ${name} -n ${namespace} --from-file ${filePath} --dry-run=client -o yaml | kubectl apply -f -`,
  )
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

export const getK8sSecret = async (name: string, namespace: string): Promise<Record<string, any> | undefined> => {
  const result = await nothrow(
    $`kubectl get secret ${name} -n ${namespace} -ojsonpath='{.data.${name}}' | base64 --decode`,
  )
  if (result.exitCode === 0) return parse(result.stdout) as Record<string, any>
  return undefined
}

export interface DeploymentState {
  status?: 'deploying' | 'deployed'
  tag?: string
  version?: string
  deployingTag?: string
  deployingVersion?: string
}

export const getDeploymentState = async (): Promise<DeploymentState> => {
  if (env.isDev && env.DISABLE_SYNC) return {}
  const result = await nothrow($`kubectl get cm -n otomi ${DEPLOYMENT_STATUS_CONFIGMAP} -o jsonpath='{.data}'`)
  return JSON.parse(result.stdout || '{}')
}

export const getHelmReleases = async (): Promise<Record<string, any>> => {
  const result = await nothrow($`helm list -A -a -o json`)
  const data = JSON.parse(result.stdout || '[]') as []
  const status = data.reduce((acc, item) => {
    // eslint-disable-next-line no-param-reassign
    acc[`${item['namespace']}/${item['name']}`] = item
    return acc
  }, {})
  return status
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
  const res = await nothrow($`${cmdPatch.split(' ')} || ${cmdCreate.split(' ')}`)
  if (res.stderr) d.error(res.stderr)
}

const fetchLoadBalancerIngressData = async (): Promise<string> => {
  const d = terminal('common:k8s:fetchLoadBalancerIngressData')
  let ingressDataString = ''
  let count = 0
  for (;;) {
    ingressDataString = (
      await $`kubectl get -n ingress svc ingress-nginx-platform-controller -o jsonpath="{.status.loadBalancer.ingress}"`
    ).stdout.trim()
    count += 1
    if (ingressDataString) return ingressDataString
    await sleep(1000)
    d.debug(`Querying LoadBalancer IP information, trial #${count}`)
  }
}

interface IngressRecord {
  ip?: string
  hostname?: string
}
export const getOtomiLoadBalancerIP = async (): Promise<string> => {
  const d = terminal('common:k8s:getOtomiLoadBalancerIP')
  d.debug('Find LoadBalancer IP or Hostname')

  const ingressDataString = await fetchLoadBalancerIngressData()
  const ingressDataList = JSON.parse(ingressDataString) as IngressRecord[]
  // We sort by IP first, and order those, and then hostname and order them as well
  const ingressDataListSorted = [
    ...ingressDataList.filter((val) => !!val.ip).sort((a, b) => a.ip!.localeCompare(b.ip!)),
    ...ingressDataList.filter((val) => !!val.hostname).sort((a, b) => a.hostname!.localeCompare(b.hostname!)),
  ]

  d.debug(ingressDataListSorted)
  if (ingressDataListSorted.length === 0) throw new Error('No LoadBalancer Ingress definitions found')
  /* A load balancer can have a hostname, ip or any list of those items. We select the first item, as we only need one.
   * And we prefer IP over hostname, as it reduces the fact that we need to resolve & select an ip.
   */
  const [firstIngressData] = ingressDataListSorted

  if (firstIngressData.ip) return firstIngressData.ip
  if (firstIngressData.hostname) {
    // Wait until DNS records are propagated to the cluster DNS
    await waitTillAvailable(`https://${firstIngressData.hostname}`, {
      skipSsl: true,
      status: 404,
      maxTimeout: 10 * 1000, // retry every max 10 seconds, so no exponential backoff
      retries: 100, // we should have a LB within 100 * 10 secs (=14 minutes)
    })
    const resolveData = await resolveAny(firstIngressData.hostname)
    const resolveDataFiltered = resolveData.filter((val) => val.type === 'A' || val.type === 'AAAA') as (
      | AnyARecord
      | AnyAaaaRecord
    )[]
    /* Sorting the filtered list
     * Prefer IPv4 over IPv6; then sort by lowest address (basic string compare)
     * This way we get always the same first IP back on a cluster
     */
    const resolveDataSorted = resolveDataFiltered.sort((a, b) => {
      const typeCompare = a.type.localeCompare(b.type)
      return !typeCompare ? typeCompare : a.address.localeCompare(b.address)
    })

    if (isEmpty(resolveDataSorted))
      throw new Error(`No A or AAAA records found for ${firstIngressData.hostname} - could not determine IP`)
    /* For consistency reasons, after sorting (and preferring the lowest numbered IPv4 address) we pick the first one
     * As there can be multiple A or AAAA records, and we only need one
     */
    const firstIP = resolveDataSorted[0].address
    return firstIP
  }
  throw new Error('LoadBalancer Ingress data did not container ip or hostname')
}

/**
 * Check whether the environment matches the configuration for the kubernetes context
 * @returns
 */
export const checkKubeContext = async (): Promise<void> => {
  const d = terminal('common:k8s:checkKubeContext')
  d.info('Validating kube context')

  const values = await hfValues()
  const currentContext = (await $`kubectl config current-context`).stdout.trim()
  const k8sContext = values?.cluster?.k8sContext
  d.debug('currentContext: ', currentContext)
  d.debug('k8sContext: ', k8sContext)

  d.info(`Current kube context: ${currentContext}`)
  if (!k8sContext) {
    throw new Error('No value for cluster.k8sContext set!')
  }
  if (k8sContext !== currentContext) {
    let fixContext = false
    if (!parser.argv.setContext) {
      fixContext = await askYesNo(
        `Warning: Your current kubernetes context (${currentContext}) does not match cluster context: ${k8sContext}. Would you like to switch kube context to cluster first?`,
        { defaultYes: true },
      )
    }
    if (fixContext || parser.argv.setContext) {
      await $`kubectl config use ${k8sContext}`
    }
  }
}

type WaitTillAvailableOptions = Options & {
  status?: number
  skipSsl?: boolean
  username?: string
  password?: string
}

export const waitTillGitRepoAvailable = async (repoUrl): Promise<void> => {
  const retryOptions: Options = {
    retries: 10,
    maxTimeout: 30000,
  }
  const d = terminal('common:k8s:waitTillGitRepoAvailable')
  await retry(async (bail) => {
    try {
      cd(env.ENV_DIR)
      // the ls-remote exist with zero even if repo is empty
      await $`git ls-remote ${repoUrl}`
    } catch (e) {
      d.warn(e.message)
      throw e
    }
  }, retryOptions)
}

export const waitTillAvailable = async (url: string, opts?: WaitTillAvailableOptions): Promise<void> => {
  const options = { status: 200, skipSsl: false, ...opts }
  const d = terminal('common:k8s:waitTillAvailable')
  const retryOptions: Options = {
    retries: 50,
    maxTimeout: 30000,
  }

  const globalSkipSsl = !env.NODE_TLS_REJECT_UNAUTHORIZED
  let rejectUnauthorized = !globalSkipSsl
  if (opts!.skipSsl !== undefined) rejectUnauthorized = !options.skipSsl
  const fetchOptions: RequestInit = {
    redirect: 'follow',
    agent: new Agent({ rejectUnauthorized }),
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

export async function createGenericSecret(
  k8s: CoreV1Api,
  name: string,
  namespace: string,
  secretData: Record<string, string>,
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

  const response = await k8s.createNamespacedSecret(namespace, secret)
  return response.body
}

export function b64enc(value: string): string {
  return Buffer.from(value).toString('base64')
}

export async function hasStsOOMKilledPods(
  statefulSetName: string,
  namespace: string,
  appsApi: AppsV1Api,
  coreApi: CoreV1Api,
): Promise<boolean> {
  try {
    // Retrieve the StatefulSet to confirm it exists
    const statefulSet = await appsApi.readNamespacedStatefulSet(statefulSetName, namespace)
    console.log(`Checking pods in StatefulSet ${statefulSetName} in namespace ${namespace}...`)

    // List pods in the StatefulSet by matching labels
    const labelSelector = Object.entries(statefulSet.body.spec?.selector.matchLabels || {})
      .map(([key, value]) => `${key}=${value}`)
      .join(',')

    const pods = await coreApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector)

    for (const pod of pods.body.items) {
      const podName = pod.metadata?.name
      const podStatus = pod.status

      // Check if the pod is in `CrashLoopBackOff`
      const isCrashLoopBackOff = podStatus?.containerStatuses?.some(
        (containerStatus) => containerStatus.state?.waiting?.reason === 'CrashLoopBackOff',
      )

      if (isCrashLoopBackOff) {
        console.log(`Pod ${podName} is in CrashLoopBackOff.`)

        // Check if any container was terminated due to `OOMKilled`
        const isOOMKilled = podStatus?.containerStatuses?.some(
          (containerStatus) => containerStatus.lastState?.terminated?.reason === 'OOMKilled',
        )

        if (isOOMKilled) {
          console.log(`Pod ${podName} in StatefulSet ${statefulSetName} was OOMKilled.`)
          return true
        } else {
          console.log(`Pod ${podName} in CrashLoopBackOff, but not OOMKilled.`)
        }
      }
    }
  } catch (error) {
    console.error(`Error checking StatefulSet ${statefulSetName}:`, error)
  }
  return false
}

export async function patchStatefulSetResources(
  statefulSetName: string,
  containerName: string,
  namespace: string,
  cpuRequest: string,
  memoryRequest: string,
  cpuLimit: string,
  memoryLimit: string,
  appsApi: AppsV1Api,
) {
  try {
    // Define the patch payload to update resource requests and limits
    const patch = {
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: containerName, // Adjust if the container name differs from StatefulSet name
                resources: {
                  requests: {
                    cpu: cpuRequest,
                    memory: memoryRequest,
                  },
                  limits: {
                    cpu: cpuLimit,
                    memory: memoryLimit,
                  },
                },
              },
            ],
          },
        },
      },
    }

    // Patch the StatefulSet with strategic merge
    await appsApi.patchNamespacedStatefulSet(
      statefulSetName,
      namespace,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } },
    )

    console.log(`Successfully patched resources for StatefulSet ${statefulSetName} in namespace ${namespace}`)
  } catch (error) {
    console.error(`Failed to patch StatefulSet ${statefulSetName}:`, error)
  }
}

export async function deleteStatefulSetPods(
  namespace: string,
  statefulSetName: string,
  appsApi: AppsV1Api,
  coreApi: CoreV1Api,
) {
  try {
    // Get the StatefulSet to retrieve its label selector
    const { body: statefulSet } = await appsApi.readNamespacedStatefulSet(statefulSetName, namespace)

    if (!statefulSet.spec?.selector?.matchLabels) {
      throw new Error(`StatefulSet ${statefulSetName} does not have matchLabels`)
    }

    const labelSelector = Object.entries(statefulSet.spec.selector.matchLabels)
      .map(([key, value]) => `${key}=${value}`)
      .join(',')

    // List all pods matching the label selector
    const { body: podList } = await coreApi.listNamespacedPod(
      namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      labelSelector,
    )

    if (podList.items.length === 0) {
      console.log(`No pods found for StatefulSet ${statefulSetName}`)
      return
    }

    // Delete each pod
    for (const pod of podList.items) {
      if (pod.metadata?.name) {
        await coreApi.deleteNamespacedPod(pod.metadata.name, namespace)
        console.log(`Deleted pod: ${pod.metadata.name}`)
      }
    }

    console.log(`All pods for StatefulSet ${statefulSetName} have been deleted.`)
  } catch (error) {
    console.error(`Failed to delete pods for StatefulSet ${statefulSetName}:`, error)
    throw error
  }
}
