import { load } from 'js-yaml'
import { $ } from 'zx'
import { Arguments } from './helm-opts'
import { asArray, ENV, LOG_LEVELS } from './no-deps'

let value: any
const trimHFOutput = (output: string): string => output.replace(/(^\W+$|skipping|basePath=)/gm, '')
const replaceHFPaths = (output: string): string => output.replaceAll('../env', ENV.DIR)

export type HFParams = {
  fileOpts?: string | string[] | null
  labelOpts?: string | string[] | null
  logLevel?: string | null
  args: string | string[]
}

export const hf = async (args: HFParams): Promise<string> => {
  const paramsCopy: HFParams = { ...args }
  paramsCopy.fileOpts = asArray(paramsCopy.fileOpts ?? [])
  paramsCopy.labelOpts = asArray(paramsCopy.labelOpts ?? [])
  paramsCopy.logLevel ??= 'warn'

  // Only ERROR, WARN, INFO or DEBUG are allowed, map other to closest neighbor
  switch (LOG_LEVELS[paramsCopy.logLevel.toUpperCase()]) {
    case LOG_LEVELS.FATAL:
      paramsCopy.logLevel = 'error'
      break
    case LOG_LEVELS.VERBOSE:
      paramsCopy.logLevel = 'info'
      break
    case LOG_LEVELS.TRACE:
      paramsCopy.logLevel = 'debug'
      break
    default:
      break
  }

  paramsCopy.args = asArray(paramsCopy.args).filter(Boolean)
  if (!paramsCopy.args || paramsCopy.args.length === 0) {
    throw new Error('No arguments were passed')
  }

  if ('KUBE_VERSION_OVERRIDE' in process.env) {
    paramsCopy.args.push(`--set kubeVersionOverride=${process.env.KUBE_VERSION_OVERRIDE}`)
  }

  const labels = paramsCopy.labelOpts?.map((item: string) => `-l=${item}`)
  const files = paramsCopy.fileOpts?.map((item: string) => `-f=${item}`)

  const stringArray = [...(labels ?? []), ...(files ?? [])]

  stringArray.push(`--log-level=${paramsCopy.logLevel.toLowerCase()}`)
  const res = await $`helmfile ${stringArray} ${paramsCopy.args}`
  return `${res.stderr.trim()}\n${res.stdout.trim()}\n`
}

export const hfTrimmed = async (args: HFParams): Promise<string> => {
  return trimHFOutput(await hf(args))
}

export const values = async (replacePath = false, asString = false): Promise<any | string> => {
  if (value) return value
  let result = await hfTrimmed({ fileOpts: './helmfile.tpl/helmfile-dump.yaml', args: 'build' })
  if (replacePath) result = replaceHFPaths(result)
  if (asString) return result
  value = load(result) as any
  return value
}

export const hfValues = async (): Promise<any> => {
  return (await values(true)).renderedValues
}

export const hfTemplate = async (argv: Arguments, outDir?: string): Promise<string> => {
  process.env.QUIET = '1'
  const args = ['template', '--skip-deps']
  if (outDir) args.push(`--output-dir=${outDir}`)
  if (argv['skip-cleanup']) args.push('--skip-cleanup')
  let template = ''
  const params: HFParams = { args }
  if (!argv.f && !argv.l) {
    template += await hf({ ...params, fileOpts: 'helmfile.tpl/helmfile-init.yaml' })
    template += '\n'
  }
  template += await hf(params)
  return template
}
