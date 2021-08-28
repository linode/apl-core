import { load } from 'js-yaml'
import { Readable, Transform } from 'stream'
import { $, ProcessOutput, ProcessPromise } from 'zx'
import { env } from './envalid'
import { asArray, getParsedArgs, logLevels, terminal } from './utils'
import { Arguments } from './yargs-opts'
import { ProcessOutputTrimmed, Streams } from './zx-enhance'

interface iValue {
  clean?: any
  rp?: any
}
const value: iValue = {
  clean: undefined,
  rp: undefined,
}

const trimHFOutput = (output: string): string => output.replace(/(^\W+$|skipping|^.*: basePath=\.)/gm, '')
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

const hfTrimmed = (args: HFParams): { proc: ProcessPromise<ProcessOutput>; stdout: Readable; stderr: Readable } => {
  const transform = new Transform({
    transform(chunk, encoding, next) {
      const str = chunk.toString()
      const transformation = trimHFOutput(str).trim()
      // if (str.indexOf('basePath=') > -1) console.debug('transformation:', `${str} > ${transformation}`)
      if (transformation && transformation.length > 0) this.push(transformation)
      next()
    },
  })
  const proc: ProcessPromise<ProcessOutput> = hfCore(args)
  return {
    stdout: proc.stdout,
    stderr: proc.stderr.pipe(transform),
    proc,
  }
}

export type HFOptions = {
  trim?: boolean
  streams?: Streams
}

export const hfStream = (args: HFParams, opts: HFOptions = {}): ProcessPromise<ProcessOutput> => {
  const trimmedOutput = hfTrimmed(args)
  if (opts?.streams?.stdout) trimmedOutput.stdout.pipe(opts.streams.stdout, { end: false })
  if (opts?.streams?.stderr) trimmedOutput.stderr.pipe(opts.streams.stderr, { end: false })
  return trimmedOutput.proc
}

export const hf = async (args: HFParams, opts?: HFOptions): Promise<ProcessOutputTrimmed> => {
  return new ProcessOutputTrimmed(await hfStream(args, opts))
}

export type ValuesOptions = {
  asString?: boolean
  replacePath?: boolean
  skipCache?: boolean
}

export const values = async (opts?: ValuesOptions): Promise<any | string> => {
  if (!opts?.skipCache) {
    if (opts?.replacePath && value.rp) {
      if (opts?.asString) return value.rp
      return value.rp
    }
    if (value.clean) {
      if (opts?.asString) return value.clean
      return value.clean
    }
  }
  const output = await hf(
    { fileOpts: `${process.cwd()}/helmfile.tpl/helmfile-dump.yaml`, args: 'build' },
    { trim: true },
  )
  value.clean = (load(output.stdout) as any).renderedvalues
  value.rp = (load(replaceHFPaths(output.stdout)) as any).renderedvalues
  if (opts?.asString) return opts && opts.replacePath ? replaceHFPaths(output.stdout) : output.stdout
  return opts?.replacePath ? value.rp : value.clean
}

export const hfValues = async (skipCache = false): Promise<any> => {
  return values({ replacePath: true, skipCache })
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
