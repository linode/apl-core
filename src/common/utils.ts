/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
import $RefParser from '@apidevtools/json-schema-ref-parser'
import retry, { Options } from 'async-retry'
import Debug, { Debugger as DebugDebugger } from 'debug'
import { existsSync, readdirSync, readFileSync } from 'fs'
import walk from 'ignore-walk'
import { dump, load } from 'js-yaml'
import { cloneDeep, merge, omit, pick, set } from 'lodash-es'
import fetch, { RequestInit } from 'node-fetch'
import { resolve } from 'path'
import { Writable, WritableOptions } from 'stream'
import { fileURLToPath } from 'url'
import yargs, { Arguments as YargsArguments } from 'yargs'
import { $, ProcessOutput, sleep } from 'zx'
import { env } from './envalid'

$.verbose = false // https://github.com/google/zx#verbose - don't need to print the SHELL executed commands
$.prefix = 'set -euo pipefail;' // https://github.com/google/zx/blob/main/index.mjs#L103

// we keep the rootDir for zx, but have to fix it for drone, which starts in /home/app/stack/env (to accommodate write perms):
export const rootDir = process.cwd() === '/home/app/stack/env' ? '/home/app/stack' : process.cwd()
export const parser = yargs(process.argv.slice(3))
export const getFilename = (path: string): string => fileURLToPath(path).split('/').pop()?.split('.')[0] as string

export interface BasicArguments extends YargsArguments {
  logLevel: string
  nonInteractive: boolean
  skipCleanup: boolean
  trace: boolean
  verbose: number
  debug: boolean
}

export const defaultBasicArguments: BasicArguments = {
  _: [],
  $0: 'defaultBasicArgs',
  logLevel: 'WARN',
  nonInteractive: true,
  skipCleanup: false,
  trace: false,
  verbose: 0,
  debug: false,
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
export type DebuggerType = DebugDebugger | ((message?: any, ...optionalParams: any[]) => void)
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

export type OtomiStreamDebugger = {
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
export function terminal(namespace: string): OtomiDebugger {
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

export async function waitTillAvailable(url: string, status = 200): Promise<void> {
  const retryOptions: Options = {
    retries: 10,
    factor: 2,
    // minTimeout: The number of milliseconds before starting the first retry. Default is 1000.
    minTimeout: 1000,
    // The maximum number of milliseconds between two retries.
    maxTimeout: 30000,
  }
  const minimumSuccessful = 10
  let count = 0
  try {
    do {
      await retry(async (bail) => {
        try {
          const fetchOptions: RequestInit = {
            redirect: 'follow',
          }
          const res = await fetch(url, fetchOptions)
          if (res.status !== status) {
            console.warn(`GET ${res.url} ${res.status}`)
            bail(new Error(`Retry`))
          } else {
            count += 1
            await sleep(1000)
          }
        } catch (e) {
          // Print system errors like ECONNREFUSED
          console.error(e.message)
          count = 0
          throw e
        }
      }, retryOptions)
    } while (count < minimumSuccessful)
  } catch (e) {
    throw new Error(`Max retries (${retryOptions.retries}) has been reached!`)
  }
}

export const flattenObject = (obj: Record<string, any>, path = ''): { [key: string]: string } => {
  return Object.entries(obj)
    .flatMap(([key, value]) => {
      const subPath = path.length ? `${path}.${key}` : key
      if (typeof value === 'object') return flattenObject(value, subPath)
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
): Promise<string | Record<string, unknown>> => {
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
    return load(processOutput.stdout.trim()) as Record<string, unknown>
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

let valuesSchema: Record<string, unknown>
export const getValuesSchema = async (): Promise<Record<string, unknown>> => {
  if (valuesSchema) return valuesSchema
  const schema = loadYaml(`${rootDir}/values-schema.yaml`)
  const derefSchema = await $RefParser.dereference(schema as $RefParser.JSONSchema)
  valuesSchema = omit(derefSchema, ['definitions', 'properties.teamConfig'])

  return valuesSchema
}

export const stringContainsSome = (str: string, ...args: string[]): boolean => {
  return args.some((arg) => str.includes(arg))
}

export const generateSecrets = async (values: Record<string, unknown>): Promise<Record<string, unknown>> => {
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
  const firstTemplateRound = (await gucci(secrets, {}, { asObject: true })) as Record<string, unknown>
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
  })) as Record<string, unknown>
  debug.debug('secondTemplateRound: ', secondTemplateRound)

  debug.info('Generated all secrets')
  const res = pick(secondTemplateRound, Object.keys(flattenObject(secrets))) // Only return values that belonged to x-secrets and are now fully templated
  debug.debug('generateSecrets result: ', res)
  return res
}

export default { parser, asArray }
