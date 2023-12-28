/* eslint-disable @typescript-eslint/no-unsafe-argument */
import Debug, { Debugger as DebugDebugger } from 'debug'
import { Writable, WritableOptions } from 'stream'
import { $ } from 'zx'
import { env } from './envalid'

const debuggers = {}

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

// this needs to be set at some point with the real cli args:
let _argv: any

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
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const logLevel = (argv?: any): number => {
  let logLevelNum = Number(logLevels[argv?.logLevel?.toUpperCase() ?? 'INFO'])
  const verbosity = Number(argv?.verbose ?? 0)
  logLevelVar = Math.max(logLevelNum, verbosity)

  const boolTrace = env.TRACE || argv?.trace
  logLevelNum = boolTrace ? logLevels.TRACE : logLevelNum
  if (logLevelVar === logLevels.TRACE) {
    $.verbose = true
    $.prefix = 'set -xeuo pipefail;'
  }
  return logLevelNum
}

export const logLevelString = (): string => {
  return logLevels[logLevel()].toString()
}
