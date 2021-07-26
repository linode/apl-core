import { bool, cleanEnv } from 'envalid'
import { existsSync, readdirSync, readFileSync } from 'fs'
import { load } from 'js-yaml'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs, { Arguments as YargsArguments } from 'yargs'
import { $ } from 'zx'

process.stdin.isTTY = false
$.verbose = false // https://github.com/google/zx#verbose - don't need to print the SHELL executed commands
$.prefix = 'set -euo pipefail;' // https://github.com/google/zx/blob/main/index.mjs#L89

export const parser = yargs(process.argv.slice(3))
export const getFilename = (path: string): string => fileURLToPath(path).split('/').pop()?.split('.')[0] as string

export interface BasicArguments extends YargsArguments {
  logLevel: string
  verbose: number
  skipCleanup: boolean
  trace: boolean
  inTerminal: boolean
  inDocker: boolean
}

export const defaultBasicArguments: BasicArguments = {
  _: [],
  $0: 'defaultBasicArgs',
  logLevel: 'WARN',
  verbose: 0,
  skipCleanup: false,
  trace: false,
  inTerminal: true,
  inDocker: true,
}

let parsedArgs: { [x: string]: unknown; _: (string | number)[]; $0: string }
const cleanedEnv = cleanEnv(process.env, {
  CI: bool({ default: false }),
  TESTING: bool({ default: false }),
  TRACE: bool({ default: false }),
  OTOMI_IN_TERMINAL: bool({ default: true }),
})
export const ENV = {
  set DIR(envDir: string) {
    process.env.ENV_DIR = envDir
  },
  get DIR(): string {
    return (process.env.ENV_DIR as string) ?? ENV.PWD
  },
  get PWD(): string {
    return process.cwd()
  },
  set PARSED_ARGS(args: { [x: string]: unknown; _: (string | number)[]; $0: string }) {
    parsedArgs = args
  },
  get PARSED_ARGS(): { [x: string]: unknown; _: (string | number)[]; $0: string } {
    return parsedArgs
  },
  get isCI(): boolean {
    return cleanedEnv.CI || !!ENV.PARSED_ARGS?.ci
  },
  get isTESTING(): boolean {
    return cleanedEnv.TESTING
  },
  get inTerminal(): boolean {
    return cleanedEnv.OTOMI_IN_TERMINAL
  },
}
export const asArray = (args: string | string[]): string[] => {
  return Array.isArray(args) ? args : [args]
}
export const readdirRecurse = async (dir: string): Promise<string[]> => {
  const dirs = readdirSync(dir, { withFileTypes: true })
  const files = await Promise.all(
    dirs.map(async (dirOrFile) => {
      const res = resolve(dir, dirOrFile.name)
      return dirOrFile.isDirectory() ? readdirRecurse(res) : res
    }),
  )
  return files.flat()
}

export const capitalize = (s: string): string => (s && s[0].toUpperCase() + s.slice(1)) || ''

export const loadYaml = (path: string): any => {
  if (!existsSync(path)) throw new Error(`${path} does not exists`)
  return load(readFileSync(path, 'utf-8')) as any
}

export enum LOG_LEVELS {
  FATAL = -2,
  ERROR = -1,
  WARN = 0,
  INFO = 1,
  VERBOSE = 1,
  DEBUG = 2,
  TRACE = 3,
}

let logLevel = Number.NEGATIVE_INFINITY
export const LOG_LEVEL = (): number => {
  if (!ENV.PARSED_ARGS) return LOG_LEVELS.ERROR
  if (logLevel > Number.NEGATIVE_INFINITY) return logLevel

  let LL = Number(LOG_LEVELS[(ENV.PARSED_ARGS as BasicArguments).logLevel?.toUpperCase() ?? 'WARN'])
  const verbosity = Number((ENV.PARSED_ARGS as BasicArguments).verbose ?? 0)
  const boolTrace = cleanedEnv.TRACE || ENV.PARSED_ARGS.trace
  LL = boolTrace ? LOG_LEVELS.TRACE : LL

  logLevel = LL < 0 && verbosity === 0 ? LL : Math.max(LL, verbosity)
  if (logLevel === LOG_LEVELS.TRACE) {
    $.verbose = true
    $.prefix = 'set -xeuo pipefail;'
  }
  return logLevel
}

export const LOG_LEVEL_STRING = (): string => {
  return LOG_LEVELS[LOG_LEVEL()].toString()
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

export default { parser, ENV, asArray }
