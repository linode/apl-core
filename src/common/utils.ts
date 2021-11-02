/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
import $RefParser from '@apidevtools/json-schema-ref-parser'
import retry, { Options } from 'async-retry'
import Debug, { Debugger as DebugDebugger } from 'debug'
import { AnyAaaaRecord, AnyARecord } from 'dns'
// eslint-disable-next-line import/no-unresolved
import { resolveAny } from 'dns/promises'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { Agent } from 'https'
import walk from 'ignore-walk'
import { dump, load } from 'js-yaml'
import { cloneDeep, isEmpty, merge, omit, pick, set } from 'lodash'
import fetch, { RequestInit } from 'node-fetch'
import { resolve } from 'path'
import { Writable, WritableOptions } from 'stream'
import yargs, { Arguments as YargsArguments } from 'yargs'
import { $, nothrow, ProcessOutput, sleep } from 'zx'
import pkg from '../../package.json'
import { DEPLOYMENT_STATUS_CONFIGMAP } from './constants'
import { cleanEnvironment, env, isChart } from './envalid'

const packagePath = process.cwd()

$.verbose = false // https://github.com/google/zx#verbose - don't need to print the SHELL executed commands
$.prefix = 'set -euo pipefail;' // https://github.com/google/zx/blob/main/index.mjs#L103

// we keep the rootDir for zx, but have to fix it for drone, which starts in /home/app/stack/env (to accommodate write perms):
export const rootDir = process.cwd() === '/home/app/stack/env' ? '/home/app/stack' : process.cwd()
export const parser = yargs(process.argv.slice(3))
export const getFilename = (path: string): string => path.split('/').pop()?.split('.')[0] as string

export interface BasicArguments extends YargsArguments {
  logLevel?: string
  nonInteractive?: boolean
  skipCleanup?: boolean
  trace?: boolean
  verbose?: number
  debug?: boolean
}

let parsedArgs: BasicArguments

const debuggers = {}

export const setParsedArgs = (args: BasicArguments): void => {
  parsedArgs = args
  // Call needed to init LL for debugger and ZX calls:
  logLevel()
}
export const getParsedArgs = (): BasicArguments => {
  return parsedArgs
}

const commonDebug: DebugDebugger = Debug('otomi')
commonDebug.enabled = true
type DebuggerType = DebugDebugger | ((message?: any, ...optionalParams: any[]) => void)
export class DebugStream extends Writable {
  output: DebuggerType

  constructor(output: DebuggerType, opts?: WritableOptions) {
    super(opts)
    this.output = output
  }

  // eslint-disable-next-line no-underscore-dangle,@typescript-eslint/explicit-module-boundary-types
  _write(chunk: any, encoding: any, callback: (error?: Error | null) => void): void {
    const data = chunk.toString().trim()
    if (data.length > 0) this.output(data)
    callback()
  }
}

type OtomiStreamDebugger = {
  log: DebugStream
  trace: DebugStream
  debug: DebugStream
  info: DebugStream
  warn: DebugStream
  error: DebugStream
}
export type OtomiDebugger = {
  base: DebuggerType
  log: DebuggerType
  trace: DebuggerType
  debug: DebuggerType
  info: DebuggerType
  warn: DebuggerType
  error: DebuggerType
  stream: OtomiStreamDebugger
}

// const xtermColors = {
//   red: [52, 124, 9, 202, 211],
//   orange: [58, 130, 202, 208, 214],
//   green: [2, 28, 34, 46, 78, 119],
// }
// const setColor = (term: DebuggerType, color: number[]) => {
//   // Console.{log,warn,error} don't have namespace, so we know if it is in there that we use the DebugDebugger
//   if (!('namespace' in term && env.STATIC_COLORS)) return
//   const t: DebugDebugger = term
//   const colons = (t.namespace.match(/:/g) || ['']).length - 1
//   t.color = color[Math.max(0, Math.min(colons, color.length - 1))].toString()
// }
/*
 * Must be function to be able to export overrides.
 */
/* eslint-disable no-redeclare */
export const terminal = (namespace: string): OtomiDebugger => {
  const createDebugger = (baseNamespace: string, cons = console.log): DebuggerType => {
    const signature = namespace + baseNamespace
    if (env.OTOMI_IN_TERMINAL) {
      if (debuggers[signature]) return debuggers[signature]
      const debugObj: DebugDebugger = commonDebug.extend(baseNamespace)
      debuggers[signature] = debugObj
      debugObj.enabled = true
      return debugObj
    }
    return cons
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = () => {}
  const base = (...args: any[]) => createDebugger(`${namespace}`).call(undefined, ...args)
  const log = (...args: any[]) => createDebugger(`${namespace}:log`).call(undefined, ...args)
  const error = (...args: any[]) => createDebugger(`${namespace}:error`, console.error).call(undefined, ...args)
  const trace = (...args: any[]) =>
    (logLevel() >= logLevels.TRACE ? createDebugger(`${namespace}:trace`) : noop).call(undefined, ...args)
  const debug = (...args: any[]) =>
    (logLevel() >= logLevels.DEBUG ? createDebugger(`${namespace}:debug`) : noop).call(undefined, ...args)
  const info = (...args: any[]) =>
    (logLevel() >= logLevels.INFO ? createDebugger(`${namespace}:info`) : noop).call(undefined, ...args)
  const warn = (...args: any[]) =>
    (logLevel() >= logLevels.WARN ? createDebugger(`${namespace}:warn`, console.warn) : noop).call(undefined, ...args)

  // setColor(error, xtermColors.red)
  // setColor(warn, xtermColors.orange)
  // setColor(info, xtermColors.green)

  return {
    base,
    log,
    trace,
    debug,
    info,
    warn,
    error,
    stream: {
      log: new DebugStream(log),
      trace: new DebugStream(trace),
      debug: new DebugStream(debug),
      info: new DebugStream(info),
      warn: new DebugStream(warn),
      error: new DebugStream(error),
    },
  }
}

export const asArray = (args: string | string[]): string[] => {
  return Array.isArray(args) ? args : [args]
}

export const readdirRecurse = async (dir: string, opts?: { skipHidden: boolean }): Promise<string[]> => {
  const dirs = readdirSync(dir, { withFileTypes: true })
  const files = await Promise.all(
    dirs.map(async (dirOrFile) => {
      const res = resolve(dir, dirOrFile.name)
      if (opts?.skipHidden && dirOrFile.name.startsWith('.')) return []
      return dirOrFile.isDirectory() ? readdirRecurse(res) : res
    }),
  )
  return files.flat()
}

export const getEnvFiles = (): Promise<string[]> => {
  return walk({
    path: env.ENV_DIR,
    ignoreFiles: ['.gitignore'],
    follow: true,
  })
}

export const loadYaml = (path: string, opts?: { noError: boolean }): Record<string, any> | undefined => {
  if (!existsSync(path)) {
    if (opts?.noError) return undefined
    throw new Error(`${path} does not exist`)
  }
  return load(readFileSync(path, 'utf-8')) as Record<string, any>
}

export enum logLevels {
  FATAL = -2,
  ERROR = -1,
  WARN = 0,
  INFO = 1,
  DEBUG = 2,
  TRACE = 3,
}

let logLevelVar = Number.NEGATIVE_INFINITY
/**
 * Determines loglevel from 4 different sources
 * - Parsed Argument: LOG_LEVEL   [string]
 * - Parsed Argument: Verbose (v) [number]
 * - Parsed Argument: Trace (t)   [boolean]
 * - Environment variable: TRACE  [(un)set]
 * @returns highest loglevel
 */
export const logLevel = (): number => {
  if (!getParsedArgs()) return logLevels.ERROR
  if (logLevelVar > Number.NEGATIVE_INFINITY) return logLevelVar

  let logLevelNum = Number(logLevels[getParsedArgs().logLevel?.toUpperCase() ?? 'WARN'])
  const verbosity = Number(getParsedArgs().verbose ?? 0)
  const boolTrace = env.TRACE || getParsedArgs().trace
  logLevelNum = boolTrace ? logLevels.TRACE : logLevelNum

  logLevelVar = logLevelNum < 0 && verbosity === 0 ? logLevelNum : Math.max(logLevelNum, verbosity)
  if (logLevelVar === logLevels.TRACE) {
    $.verbose = true
    $.prefix = 'set -xeuo pipefail;'
  }
  return logLevelVar
}

export const logLevelString = (): string => {
  return logLevels[logLevel()].toString()
}

type WaitTillAvailableOptions = {
  status?: number
  retries?: number
  skipSsl?: boolean
  username?: string
  password?: string
}

export const waitTillAvailable = async (url: string, opts?: WaitTillAvailableOptions): Promise<void> => {
  const debug = terminal('waitTillAvailable')
  const defaultOptions: WaitTillAvailableOptions = { status: 200, retries: 10, skipSsl: false }
  const options: WaitTillAvailableOptions = { ...defaultOptions, ...opts }
  const retryOptions: Options = {
    retries: options.retries === 0 ? 10 : options.retries,
    forever: options.retries === 0,
    factor: 2,
    // minTimeout: The number of milliseconds before starting the first retry. Default is 1000.
    minTimeout: 1000,
    // The maximum number of milliseconds between two retries.
    maxTimeout: 30000,
  }

  // apply.ts:commitOnFirstRun can modify NODE_TLS_REJECT_UNAUTHORIZED
  // So the process.env needs to be re-parsed
  const clnEnv = cleanEnvironment()
  // Due to Boolean OR statement, first NODE_TLS_REJECT_UNAUTORIZED needs to be inverted
  // It is false if needs to skip SSL, and that doesn't work with OR
  // Then it needs to be negated again
  const rejectUnauthorized = !(options.skipSsl || !clnEnv.NODE_TLS_REJECT_UNAUTHORIZED)
  const fetchOptions: RequestInit = {
    redirect: 'follow',
    agent: new Agent({ rejectUnauthorized }),
  }
  if (options.username && options.password) {
    fetchOptions.headers = {
      Authorization: `Basic ${Buffer.from(`${options.username}:${options.password}`).toString('base64')}`,
    }
  }

  // we don't trust dns in the cluster and want a lot of confirmations
  // but we don't care about those when we call the cluster from outside
  const minimumSuccessful = isChart ? 10 : 0
  let count = 0
  try {
    do {
      await retry(async (bail) => {
        try {
          const res = await fetch(url, fetchOptions)
          if (res.status !== options.status) {
            debug.warn(`GET ${res.url} ${res.status} ${options.status}`)
            bail(new Error(`Retry`))
          } else {
            count += 1
            debug.debug(`${count}/${minimumSuccessful} success`)
            await sleep(1000)
          }
        } catch (e) {
          // Print system errors like ECONNREFUSED
          debug.error(e.message)
          count = 0
          throw e
        }
      }, retryOptions)
    } while (count < minimumSuccessful)
    debug.debug(`Waiting done, ${count}/${minimumSuccessful} found`)
  } catch (e) {
    throw new Error(`Max retries (${retryOptions.retries}) has been reached!`)
  }
}

export const flattenObject = (obj: Record<string, any>, path = ''): { [key: string]: string } => {
  return Object.entries(obj)
    .flatMap(([key, value]) => {
      const subPath = path.length ? `${path}.${key}` : key
      if (typeof value === 'object' && !Array.isArray(value)) return flattenObject(value, subPath)
      return { [subPath]: value }
    })
    .reduce((acc, base) => {
      return { ...acc, ...base }
    }, {})
}
export interface GucciOptions {
  asObject?: boolean
}
export const gucci = async (
  tmpl: string | unknown,
  args: { [key: string]: any },
  opts?: GucciOptions,
): Promise<string | Record<string, any>> => {
  const kv = flattenObject(args)
  const gucciArgs = Object.entries(kv).map(([k, v]) => {
    // Cannot template if key contains regex characters, so skip
    if (stringContainsSome(k, ...'^()[]$'.split(''))) return ''
    return `-s ${k}='${v ?? ''}'`
  })

  const quoteBackup = $.quote
  $.quote = (v) => v
  try {
    let processOutput: ProcessOutput
    const templateContent: string = typeof tmpl === 'string' ? tmpl : dump(tmpl, { lineWidth: -1 })
    // Cannot be a path if it wasn't a string
    if (typeof tmpl === 'string' && existsSync(templateContent)) {
      processOutput = await $`gucci -o missingkey=zero ${gucciArgs} ${templateContent}`
    } else {
      // input string is a go template content
      processOutput = await $`echo "${templateContent.replaceAll('"', '\\"')}" | gucci -o missingkey=zero ${gucciArgs}`
    }
    // Defaults to returning string, unless stated otherwise
    if (!opts?.asObject) return processOutput.stdout.trim()
    return load(processOutput.stdout.trim()) as Record<string, any>
  } finally {
    $.quote = quoteBackup
  }
}

/* Can't use for now because of:
https://github.com/homeport/dyff/issues/173
export const gitDyff = async(filePath: string, jsonPathFilter: string = ''): Promise<boolean> => {
  const result = await nothrow($`git show HEAD:${filePath} | dyff between --filter "${jsonPathFilter}" --set-exit-code --omit-header - ${filePath}`)
  const isThereADiff = result.exitCode === 1
  return isThereADiff
}
*/

export const extract = (schema: Record<string, any>, leaf: string, mapValue = (val: any) => val): any => {
  const schemaKeywords = ['properties', 'anyOf', 'allOf', 'oneOf', 'default', 'x-secret']
  return Object.keys(schema)
    .map((key) => {
      const childObj = schema[key]
      if (key === leaf) return schemaKeywords.includes(key) ? mapValue(childObj) : { [key]: mapValue(childObj) }
      if (typeof childObj !== 'object') return {}
      const obj = extract(childObj, leaf, mapValue)
      if ('extractedValue' in obj) return { [key]: obj.extractedValue }
      // eslint-disable-next-line no-nested-ternary
      return schemaKeywords.includes(key) || !Object.keys(obj).length || !Number.isNaN(Number(key))
        ? obj === '{}'
          ? undefined
          : obj
        : { [key]: obj }
    })
    .reduce((accumulator, extractedValue) => {
      return typeof extractedValue !== 'object'
        ? { ...accumulator, extractedValue }
        : { ...accumulator, ...extractedValue }
    }, {})
}

let valuesSchema: Record<string, any>
export const getValuesSchema = async (): Promise<Record<string, any>> => {
  if (valuesSchema) return valuesSchema
  const schema = loadYaml(`${rootDir}/values-schema.yaml`)
  const derefSchema = await $RefParser.dereference(schema as $RefParser.JSONSchema)
  valuesSchema = omit(derefSchema, ['definitions', 'properties.teamConfig'])

  return valuesSchema
}

export const stringContainsSome = (str: string, ...args: string[]): boolean => {
  return args.some((arg) => str.includes(arg))
}

export const generateSecrets = async (values: Record<string, any> = {}): Promise<Record<string, any>> => {
  const debug: OtomiDebugger = terminal('generateSecrets')
  const leaf = 'x-secret'
  const localRefs = ['.dot.', '.v.', '.root.', '.o.']

  const schema = await getValuesSchema()

  debug.info('Extracting secrets')
  const secrets = extract(schema, leaf, (val: any) => {
    if (val.length > 0) {
      if (stringContainsSome(val, ...localRefs)) return val
      return `{{ ${val} }}`
    }
    return undefined
  })
  debug.debug('secrets: ', secrets)
  debug.info('First round of templating')
  const firstTemplateRound = (await gucci(secrets, {}, { asObject: true })) as Record<string, any>
  const firstTemplateFlattend = flattenObject(firstTemplateRound)

  debug.info('Parsing values for second round of templating')
  const expandedTemplates = Object.entries(firstTemplateFlattend)
    // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
    .filter(([_, v]) => stringContainsSome(v, ...localRefs))
    .map(([path, v]: string[]) => {
      /*
       * dotDot:
       *  Get full path, except last item, this allows to parse for siblings
       * dotV:
       *  Get .v by getting the second . after charts
       *  charts.hello.world
       *  ^----------^ Get this content (charts.hello)
       */
      const dotDot = path.slice(0, path.lastIndexOf('.'))
      const dotV = path.slice(0, path.indexOf('.', path.indexOf('charts.') + 'charts.'.length))

      const sDot = v.replaceAll('.dot.', `.${dotDot}.`)
      const vDot = sDot.replaceAll('.v.', `.${dotV}.`)
      const oDot = vDot.replaceAll('.o.', '.otomi.')
      const rootDot = oDot.replaceAll('.root.', '.')
      return [path, rootDot]
    })

  expandedTemplates.map(([k, v]) => {
    // Activate these templates and put them back into the object
    set(firstTemplateRound, k, `{{ ${v} }}`)
    return [k, v]
  })
  debug.debug('firstTemplateRound: ', firstTemplateRound)

  debug.info('Gather all values for the second round of templating')
  const gucciOutputAsTemplate = merge(cloneDeep(firstTemplateRound), values)
  debug.debug('gucciOutputAsTemplate: ', gucciOutputAsTemplate)

  debug.info('Second round of templating')
  const secondTemplateRound = (await gucci(firstTemplateRound, gucciOutputAsTemplate, {
    asObject: true,
  })) as Record<string, any>
  debug.debug('secondTemplateRound: ', secondTemplateRound)

  debug.info('Generated all secrets')
  const res = pick(secondTemplateRound, Object.keys(flattenObject(secrets))) // Only return values that belonged to x-secrets and are now fully templated
  debug.debug('generateSecrets result: ', res)
  return res
}

export const createK8sSecret = async (
  name: string,
  namespace: string,
  data: Record<string, any> | string,
): Promise<void> => {
  const debug: OtomiDebugger = terminal('createK8sSecret')
  const rawString = dump(data)
  const path = `/tmp/${name}`
  writeFileSync(path, rawString)
  const result =
    await $`kubectl create secret generic ${name} -n ${namespace} --from-file ${path} --dry-run=client -o yaml | kubectl apply -f -`
  if (result.stderr) debug.error(result.stderr)
  debug.debug(`kubectl create secret output: \n ${result.stdout}`)
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
  const d = terminal('fetchLoadBalancerIngressData')
  let ingressDataString = ''
  let count = 0
  for (;;) {
    ingressDataString = (
      await $`kubectl get -n ingress svc nginx-ingress-controller -o jsonpath="{.status.loadBalancer.ingress}"`
    ).stdout.trim()
    count += 1
    if (!isEmpty(ingressDataString)) break
    await sleep(250)
    d.debug(`Trying to get LoadBalancer ingress information, trial ${count}`)
  }
  return ingressDataString
}

interface IngressRecord {
  ip?: string
  hostname?: string
}
export const getOtomiLoadBalancerIP = async (): Promise<string> => {
  const d = terminal('getOtomiLoadBalancerIP')
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

const isCoreCheck = (): boolean => {
  if (packagePath === '/home/app/stack' || !existsSync(`${packagePath}/package.json`)) return false
  return pkg.name === 'otomi-core'
}

export const isCore = isCoreCheck()
