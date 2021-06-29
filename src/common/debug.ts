import Debug from 'debug'
import { LOG_LEVEL, LOG_LEVELS } from './no-deps'

const SET_STATIC_COLORS = process.env.STATIC_COLORS ?? false

const commonDebug: Debug.Debugger = Debug('otomi')
commonDebug.enabled = true

export type OtomiDebugger = {
  enabled: boolean
  base: Debug.Debugger
  log: Debug.Debugger
  trace: Debug.Debugger
  debug: Debug.Debugger
  verbose: Debug.Debugger
  warn: Debug.Debugger
  error: Debug.Debugger
  exit: (exitCode: number, ...args: any[]) => void
  extend: (namespace: string) => OtomiDebugger
}

const xtermColors = {
  red: [52, 124, 9, 202, 211],
  orange: [58, 130, 202, 208, 214],
  green: [2, 28, 34, 46, 78, 119],
}
const getColor = (namespace: string, color: number[]): string => {
  const colons = (namespace.match(/:/g) || ['']).length - 1
  return color[Math.max(0, Math.min(colons, color.length - 1))].toString()
}
/*
 * Must be function to be able to export overrides.
 */
/* eslint-disable no-redeclare */
export function terminal(namespace: string): OtomiDebugger
export function terminal(namespace: string, enabled: boolean): OtomiDebugger
export function terminal(namespace: string, debug: OtomiDebugger): OtomiDebugger
export function terminal(namespace: string, enabledOrDebugger?: boolean | OtomiDebugger): OtomiDebugger {
  let terminalEnabled = true
  let debugObj: OtomiDebugger | undefined
  if (typeof enabledOrDebugger === 'boolean') {
    terminalEnabled = enabledOrDebugger
  } else {
    terminalEnabled = enabledOrDebugger?.enabled ?? terminalEnabled
    debugObj = enabledOrDebugger
  }
  const newDebug = (baseNamespace: string, enabled = true, debugExtend?: Debug.Debugger): Debug.Debugger => {
    const baseDebug = debugExtend ?? commonDebug
    const newDebugObj: Debug.Debugger = baseDebug.extend(baseNamespace)
    newDebugObj.enabled = enabled
    return newDebugObj
  }
  const base = newDebug(`${namespace}`, terminalEnabled, debugObj?.base)
  const log = newDebug(`${namespace}:log`, terminalEnabled, debugObj?.base)
  const trace = newDebug(`${namespace}:trace`, LOG_LEVEL() >= LOG_LEVELS.TRACE && terminalEnabled, debugObj?.base)
  const debug = newDebug(`${namespace}:debug`, LOG_LEVEL() >= LOG_LEVELS.DEBUG && terminalEnabled, debugObj?.base)
  const verbose = newDebug(`${namespace}:verbose`, LOG_LEVEL() >= LOG_LEVELS.VERBOSE && terminalEnabled, debugObj?.base)
  const warn = newDebug(`${namespace}:warn`, LOG_LEVEL() >= LOG_LEVELS.WARN && terminalEnabled, debugObj?.base)
  const error = newDebug(`${namespace}:error`, LOG_LEVEL() >= LOG_LEVELS.ERROR && terminalEnabled, debugObj?.base)
  const exit = (exitCode: number, ...args: any[]) => {
    const exitDebug = newDebug(`${namespace}:crit`, terminalEnabled, debugObj?.base)
    if (SET_STATIC_COLORS) exitDebug.color = getColor(base.namespace, xtermColors.red)
    args.map((arg) => exitDebug('', arg))
    process.exit(exitCode)
  }
  if (SET_STATIC_COLORS) error.color = getColor(base.namespace, xtermColors.red)
  if (SET_STATIC_COLORS) warn.color = getColor(base.namespace, xtermColors.orange)
  if (SET_STATIC_COLORS) verbose.color = getColor(base.namespace, xtermColors.green)

  const newDebugger: OtomiDebugger = {
    enabled: terminalEnabled,
    base,
    log,
    trace,
    debug,
    verbose,
    warn,
    error,
    exit,
    extend: (newNS: string) => {
      return terminal(newNS)
    },
  }
  newDebugger.extend = (newNS: string) => {
    return terminal(newNS, newDebugger)
  }
  return newDebugger
}
/* eslint-enable no-redeclare */
