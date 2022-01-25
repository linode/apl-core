/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
import retry, { Options } from 'async-retry'
import { AnyAaaaRecord, AnyARecord } from 'dns'
// eslint-disable-next-line import/no-unresolved
import { resolveAny } from 'dns/promises'
import { access, mkdir, writeFile } from 'fs/promises'
import { Agent } from 'https'
import { dump, load } from 'js-yaml'
import { isEmpty } from 'lodash'
import fetch, { RequestInit } from 'node-fetch'
import { dirname, join } from 'path'
import { $, nothrow, sleep } from 'zx'
import { DEPLOYMENT_PASSWORDS_SECRET, DEPLOYMENT_STATUS_CONFIGMAP } from './constants'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import { parser } from './yargs'
import { askYesNo } from './zx-enhance'

export const secretId = `secret/${env.DEPLOYMENT_NAMESPACE}/${DEPLOYMENT_PASSWORDS_SECRET}`

export const createK8sSecret = async (
  name: string,
  namespace: string,
  data: Record<string, any> | string,
): Promise<void> => {
  const d = terminal('common:k8s:createK8sSecret')
  const rawString = dump(data)
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
  if (result.stderr) d.error(result.stderr)
  d.debug(`kubectl create secret output: \n ${result.stdout}`)
}

export const getK8sSecret = async (name: string, namespace: string): Promise<Record<string, any> | undefined> => {
  const result = await nothrow(
    $`kubectl get secret ${name} -n ${namespace} -ojsonpath='{.data.${name}}' | base64 --decode`,
  )
  if (result.exitCode === 0) return load(result.stdout) as Record<string, any>
  return undefined
}

export const getOtomiDeploymentStatus = async (): Promise<string> => {
  const result = await nothrow(
    $`kubectl get cm -n ${env.DEPLOYMENT_NAMESPACE} ${DEPLOYMENT_STATUS_CONFIGMAP} -o jsonpath='{.data.status}'`,
  )
  return result.stdout
}

const fetchLoadBalancerIngressData = async (): Promise<string> => {
  const d = terminal('common:k8s:fetchLoadBalancerIngressData')
  let ingressDataString = ''
  let count = 0
  for (;;) {
    ingressDataString = (
      await $`kubectl get -n ingress svc nginx-ingress-controller -o jsonpath="{.status.loadBalancer.ingress}"`
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
  const firstIngressData = ingressDataListSorted[0]

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
