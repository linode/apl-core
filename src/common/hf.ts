import { dump, load } from 'js-yaml'
import { Transform } from 'stream'
import { $, ProcessOutput, ProcessPromise } from 'zx'
import { terminal } from './debug'
import { env } from './envalid'
import { asArray, getParsedArgs, logLevels } from './utils'
import { Arguments } from './yargs-opts'
import { ProcessOutputTrimmed, Streams } from './zx-enhance'

const value = {
  clean: null,
  rp: null,
}

const trimHFOutput = (output: string): string => output.replace(/(^\W+$|skipping|basePath=)/gm, '')
const replaceHFPaths = (output: string): string => output.replaceAll('../env', env.ENV_DIR)

export type HFParams = {
  fileOpts?: string | string[] | null
  labelOpts?: string | string[] | null
  logLevel?: string | null
  args: string | string[]
}

const hfCore = (args: HFParams): ProcessPromise<ProcessOutput> => {
  const paramsCopy: HFParams = { ...args }
  paramsCopy.fileOpts = asArray(paramsCopy.fileOpts ?? [])
  paramsCopy.labelOpts = asArray(paramsCopy.labelOpts ?? [])
  paramsCopy.logLevel ??= 'warn'

  // Only ERROR, WARN, INFO or DEBUG are allowed, map other to closest neighbor
  switch (logLevels[paramsCopy.logLevel.toUpperCase()]) {
    case logLevels.FATAL:
      paramsCopy.logLevel = 'error'
      break
    case logLevels.DEBUG:
    case logLevels.TRACE:
      paramsCopy.logLevel = 'info'
      break
    default:
      break
  }
  const parsedArgs = getParsedArgs()
  if (parsedArgs?.debug) paramsCopy.logLevel = 'debug'

  paramsCopy.args = asArray(paramsCopy.args).filter(Boolean)
  if (!paramsCopy.args || paramsCopy.args.length === 0) {
    throw new Error('No arguments were passed')
  }

  if (env.KUBE_VERSION_OVERRIDE && env.KUBE_VERSION_OVERRIDE.length > 0) {
    paramsCopy.args.push(`--set kubeVersionOverride=${env.KUBE_VERSION_OVERRIDE}`)
  }

  const labels = paramsCopy.labelOpts?.map((item: string) => `-l=${item}`)
  const files = paramsCopy.fileOpts?.map((item: string) => `-f=${item}`)

  const stringArray = [...(labels ?? []), ...(files ?? [])]

  stringArray.push(`--log-level=${paramsCopy.logLevel.toLowerCase()}`)
  const proc = $`helmfile ${stringArray} ${paramsCopy.args}`
  return proc
}

const hfTrimmed = (args: HFParams): ProcessPromise<ProcessOutput> => {
  const transform = new Transform({
    transform(chunk, encoding, next) {
      const transformation = trimHFOutput(chunk.toString()).trim()
      if (transformation && transformation.length > 0) this.push(transformation)
      next()
    },
  })
  const proc: ProcessPromise<ProcessOutput> = hfCore(args)
  proc.stdout.pipe(transform)
  return proc
}

export type HFOptions = {
  trim?: boolean
  streams?: Streams
}

export const hfStream = (args: HFParams, opts?: HFOptions): ProcessPromise<ProcessOutput> => {
  const proc = opts?.trim ? hfTrimmed(args) : hfCore(args)
  if (opts?.streams?.stdout) proc.stdout.pipe(opts.streams.stdout, { end: false })
  if (opts?.streams?.stderr) proc.stderr.pipe(opts.streams.stderr, { end: false })
  return proc
}

export const hf = async (args: HFParams, opts?: HFOptions): Promise<ProcessOutputTrimmed> => {
  return new ProcessOutputTrimmed(await hfStream(args, opts))
}

export type ValuesOptions = {
  replacePath?: boolean
  asString?: boolean
}

export const values = async (opts?: ValuesOptions): Promise<any | string> => {
  if (opts?.replacePath && value.rp) {
    if (opts?.asString) return dump(value.rp)
    return value.rp
  }
  if (value.clean) {
    if (opts?.asString) return dump(value.clean)
    return value.clean
  }
  const output = await hf({ fileOpts: './helmfile.tpl/helmfile-dump.yaml', args: 'build' }, { trim: true })
  value.clean = load(output.stdout) as any
  value.rp = load(replaceHFPaths(output.stdout)) as any
  if (opts?.asString) return opts && opts.replacePath ? replaceHFPaths(output.stdout) : output.stdout
  return opts && opts.replacePath ? value.rp : value.clean
}

export const hfValues = async (): Promise<any> => {
  return (await values({ replacePath: true })).renderedvalues
}

export const hfTemplate = async (argv: Arguments, outDir?: string, streams?: Streams): Promise<string> => {
  const debug = terminal('hfTemplate')
  process.env.QUIET = '1'
  const args = ['template', '--skip-deps']
  if (outDir) args.push(`--output-dir=${outDir}`)
  if (argv.skipCleanup) args.push('--skip-cleanup')
  let template = ''
  const params: HFParams = { args, fileOpts: argv.file, labelOpts: argv.label, logLevel: argv.logLevel }
  if (!argv.f && !argv.l) {
    const file = 'helmfile.tpl/helmfile-init.yaml'
    debug.debug(`Templating ${file} started`)
    const outInit = await hf({ ...params, fileOpts: file }, { streams })
    debug.debug(`Templating ${file} done`)
    template += outInit.stdout
    template += '\n'
  }
  debug.debug('Templating charts started')
  const outAll = await hf(params, { streams })
  debug.debug('Templating charts done')
  template += outAll.stdout
  return template
}
