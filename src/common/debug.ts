import Debug, { Debugger as DebugDebugger } from 'debug'
import { Writable, WritableOptions } from 'stream'
import { env } from './envalid'
import { logLevel, LOG_LEVELS } from './utils'

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
  enabled: boolean
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
  const terminal: DebugDebugger = term
  const colons = (terminal.namespace.match(/:/g) || ['']).length - 1
  terminal.color = color[Math.max(0, Math.min(colons, color.length - 1))].toString()
}
/*
 * Must be function to be able to export overrides.
 */
/* eslint-disable no-redeclare */
export function terminal(namespace: string): OtomiDebugger
export function terminal(namespace: string, terminalEnabled?: boolean): OtomiDebugger {
  const newDebug = (baseNamespace: string, enabled = true, cons = console.log): DebuggerType => {
    if (env.OTOMI_IN_TERMINAL) {
      const newDebugObj: DebugDebugger = commonDebug.extend(baseNamespace)
      newDebugObj.enabled = enabled
      return newDebugObj
    }
    if (enabled) {
      return cons
    }
    return () => {
      /* Do nothing */
    }
  }
  const base = newDebug(`${namespace}`, terminalEnabled)
  const log = newDebug(`${namespace}:log`, true)
  const error = newDebug(`${namespace}:error`, true, console.error)
  const trace = newDebug(`${namespace}:trace`, logLevel() >= LOG_LEVELS.TRACE && terminalEnabled)
  const debug = newDebug(`${namespace}:debug`, logLevel() >= LOG_LEVELS.DEBUG && terminalEnabled)
  const info = newDebug(`${namespace}:info`, logLevel() >= LOG_LEVELS.INFO && terminalEnabled)
  const warn = newDebug(`${namespace}:warn`, logLevel() >= LOG_LEVELS.WARN && terminalEnabled, console.warn)

  setColor(error, xtermColors.red)
  setColor(warn, xtermColors.orange)
  setColor(info, xtermColors.green)

  const newDebugger: OtomiDebugger = {
    enabled: terminalEnabled ?? true,
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
  return newDebugger
}
/* eslint-enable no-redeclare */
