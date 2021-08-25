import Debug, { Debugger as DebugDebugger } from 'debug'
import { existsSync, readdirSync, readFileSync } from 'fs'
import walk from 'ignore-walk'
import { load } from 'js-yaml'
import fetch from 'node-fetch'
import { resolve } from 'path'
import { Writable, WritableOptions } from 'stream'
import { fileURLToPath } from 'url'
import yargs, { Arguments as YargsArguments } from 'yargs'
import { $ } from 'zx'
import { env } from './envalid'

$.verbose = false // https://github.com/google/zx#verbose - don't need to print the SHELL executed commands
$.prefix = 'set -euo pipefail;' // https://github.com/google/zx/blob/main/index.mjs#L103

export const startingDir = process.cwd()
export const currDir = async (): Promise<string> => (await $`pwd`).stdout.trim()
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

const xtermColors = {
  red: [52, 124, 9, 202, 211],
  orange: [58, 130, 202, 208, 214],
  green: [2, 28, 34, 46, 78, 119],
}
const setColor = (term: DebuggerType, color: number[]) => {
  // Console.{log,warn,error} don't have namespace, so we know if it is in there that we use the DebugDebugger
  if (!('namespace' in term && env.STATIC_COLORS)) return
  const t: DebugDebugger = term
  const colons = (t.namespace.match(/:/g) || ['']).length - 1
  t.color = color[Math.max(0, Math.min(colons, color.length - 1))].toString()
}
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

export const loadYaml = (path: string, opts?: { noError: boolean }): any => {
  if (!existsSync(path)) {
    if (opts?.noError) return null
    throw new Error(`${path} does not exist`)
  }
  return load(readFileSync(path, 'utf-8')) as any
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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const deletePropertyPath = (object: any, path: string): void => {
  if (!object || !path) {
    return
  }
  const pathList = path.split('.')
  let obj = object
  for (let i = 0; i < pathList.length - 1; i++) {
    obj = obj[pathList[i]]

    if (!obj) {
      return
    }
  }

  delete obj[pathList.pop() as string]
}
export const delay = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms))

export const waitTillAvailable = async (dom: string, subsequentExists = 3): Promise<void> => {
  // node-fetch 'only absolute URLs are supported' thats why https needs to be prepended if it doesn't exist
  const domain = dom.startsWith('http') ? dom : `https://${dom}`
  const waitDebug = terminal('waitTillAvailable')
  let count = 0
  // Need to wait for 3 subsequent exists, since DNS doesn't always propagate equally
  do {
    waitDebug.debug(`Waiting for ${domain} ...`)
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(domain, { redirect: 'follow' })
      if (res.ok) {
        count += 1
      } else {
        count = 0
        waitDebug.debug(`Waiting for ${domain} could not fetch, trying again`)
      }
    } catch (error) {
      count = 0
      waitDebug.error(error.message)
    }
    // eslint-disable-next-line no-await-in-loop
    await delay(250)
  } while (count < subsequentExists)
  waitDebug.debug(`Waiting for ${domain} succeeded`)
}

export const gucci = async (tmpl: string, args: { [key: string]: string }): Promise<string | undefined> => {
  const debug = terminal('gucci')
  const gucciArgs = Object.entries(args).map(([k, v]) => `-s ${k}='${v ?? ''}'`)
  const quoteBackup = $.quote
  $.quote = (v) => v
  try {
    const processOutput = await $`gucci ${gucciArgs} ${tmpl}`
    return processOutput.stdout.trim()
  } catch (error) {
    debug.warn('Gucci templating failed (possibly due to missing values)')
    debug.debug(error)
    // TODO: Don't swallow when validate-values can validate subpaths
    return undefined
    // throw error
  } finally {
    $.quote = quoteBackup
  }
}

export const chunkArray = (input: any[], chunkSize: number): any[][] => {
  return input.reduce((resultArray: string[][], item: string, index: number) => {
    const chunkIndex = Math.floor(index / chunkSize)

    // eslint-disable-next-line no-param-reassign
    if (!resultArray[chunkIndex]) resultArray[chunkIndex] = [] // start a new chunk
    resultArray[chunkIndex].push(item)

    return resultArray
  }, [])
}

/* Can't use for now because of:
https://github.com/homeport/dyff/issues/173
export const gitDyff = async(filePath: string, jsonPathFilter: string = ''): Promise<boolean> => {
  const result = await nothrow($`git show HEAD:${filePath} | dyff between --filter "${jsonPathFilter}" --set-exit-code --omit-header - ${filePath}`)
  const isThereADiff = result.exitCode === 1
  return isThereADiff
}
*/
export default { parser, asArray }
