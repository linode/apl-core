import { readdirSync } from 'fs'
import { resolve } from 'path'
import yargs, { Arguments as YargsArguments } from 'yargs'
import { $ } from 'zx'

process.stdin.isTTY = false
$.verbose = false // https://github.com/google/zx#verbose - don't need to print the SHELL executed commands
$.prefix = 'set -euo pipefail;' // https://github.com/google/zx/blob/main/index.mjs#L88

export const parser = yargs(process.argv.slice(3))
export interface BasicArguments extends YargsArguments {
  logLevel: string
  verbose: number
  v: number
  skipCleanup: boolean
  c: boolean
}

let parsedArgs: { [x: string]: unknown; _: (string | number)[]; $0: string }
export const ENV = {
  set DIR(envDir: string) {
    process.env.ENV_DIR = envDir
  },
  get DIR(): string {
    return process.env.ENV_DIR as string
  },
  get CURR_DIR(): Promise<string> {
    return (async () => (await $`pwd`).stdout.trim())()
  },
  set PARSED_ARGS(args: { [x: string]: unknown; _: (string | number)[]; $0: string }) {
    parsedArgs = args
  },
  get PARSED_ARGS(): { [x: string]: unknown; _: (string | number)[]; $0: string } {
    return parsedArgs
  },
  get isCI(): boolean {
    return 'CI' in process.env
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

  const LL = Number(LOG_LEVELS[(parser?.argv as BasicArguments).logLevel])
  const verbosity = Number((parser?.argv as BasicArguments).verbose)
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

export default { parser, ENV, asArray }
