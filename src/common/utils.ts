import { existsSync, readdirSync, readFileSync } from 'fs'
import { load } from 'js-yaml'
import fetch from 'node-fetch'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs, { Arguments as YargsArguments } from 'yargs'
import { $, cd, nothrow } from 'zx'
import { terminal } from './debug'
import { env } from './envalid'

process.stdin.isTTY = false
$.verbose = false // https://github.com/google/zx#verbose - don't need to print the SHELL executed commands
$.prefix = 'set -euo pipefail;' // https://github.com/google/zx/blob/main/index.mjs#L89

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

export const setParsedArgs = (args: BasicArguments): void => {
  parsedArgs = args
}
export const getParsedArgs = (): BasicArguments => {
  return parsedArgs
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

export const capitalize = (s: string): string =>
  (s &&
    s
      .split(' ')
      .map((s2) => s2[0].toUpperCase() + s2.slice(1))
      .join(' ')) ||
  ''

export const gitPush = async (
  branch: string,
  sslVerify,
  giteaUrl: string | undefined = undefined,
): Promise<boolean> => {
  const debug = terminal('Gitea Push')
  debug.info('Gitea push')
  let skipSslVerify = ''
  if (giteaUrl) {
    if (!sslVerify) skipSslVerify = '-c http.sslVerify=false'
    await waitTillAvailable(giteaUrl)
  }

  const currDirVal = await currDir()

  cd(env.ENV_DIR)
  try {
    await $`git ${skipSslVerify} push -u origin ${branch} -f`
    debug.log('Otomi-values has been pushed to gitea')
    return true
  } catch (error) {
    debug.error(error)
    return false
  } finally {
    cd(currDirVal)
  }
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

export const waitTillAvailable = async (domain: string, subsequentExists = 3): Promise<void> => {
  let count = 0
  // Need to wait for 3 subsequent exists, since DNS doesn't always propagate equally
  do {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(domain, { redirect: 'follow' })
      if (res.ok) {
        count += 1
      } else {
        count = 0
      }
    } catch (_) {
      count = 0
    }
    // eslint-disable-next-line no-await-in-loop
    await delay(250)
  } while (count < subsequentExists)
}

export const gucci = async (tmpl: string, args: { [key: string]: string }): Promise<string> => {
  const gucciArgs = Object.entries(args).map(([k, v]) => `-s ${k}='${v ?? ''}'`)
  const quoteBackup = $.quote
  $.quote = (v) => v
  const processOutput = await nothrow($`gucci ${gucciArgs} ${tmpl}`)
  $.quote = quoteBackup
  return processOutput.stdout.trim()
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
