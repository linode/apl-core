import { existsSync } from 'fs'
import { load } from 'js-yaml'
import { Transform } from 'stream'
import { $, ProcessOutput, ProcessPromise } from 'zx'
import { logLevels, terminal } from './debug'
import { env } from './envalid'
import { asArray, rootDir } from './utils'
import { getParsedArgs, HelmArguments } from './yargs'
import { ProcessOutputTrimmed, Streams } from './zx-enhance'

const trimHFOutput = (output: string): string => output.replace(/(^\W+$|skipping|^.*: basePath=\.)/gm, '')
const replaceHFPaths = (output: string): string => output.replaceAll('../env', env().ENV_DIR)

type HFParams = {
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

  if (env().KUBE_VERSION_OVERRIDE && env().KUBE_VERSION_OVERRIDE.length > 0) {
    paramsCopy.args.push(`--set kubeVersionOverride=${env().KUBE_VERSION_OVERRIDE}`)
  }

  const labels = paramsCopy.labelOpts?.map((item: string) => `-l=${item}`)
  const files = paramsCopy.fileOpts?.map((item: string) => `-f=${item}`)

  const stringArray = [...(labels ?? []), ...(files ?? [])]

  stringArray.push(`--log-level=${paramsCopy.logLevel.toLowerCase()}`)
  const proc = $`helmfile ${stringArray} ${paramsCopy.args}`
  return proc
}

type HFOptions = {
  streams?: Streams
}

export const hf = async (args: HFParams, opts?: HFOptions): Promise<ProcessOutputTrimmed> => {
  // we do some transformations to strip out unwanted noise, which helmfile generates because reasons
  const transform = new Transform({
    transform(chunk, encoding, next) {
      const str = chunk.toString()
      const transformation = trimHFOutput(str).trim()
      if (transformation && transformation.length > 0) this.push(transformation)
      next()
    },
  })
  const proc: ProcessPromise<ProcessOutput> = hfCore(args)
  const output = {
    stdout: proc.stdout,
    stderr: proc.stderr.pipe(transform),
    proc,
  }

  if (opts?.streams?.stdout) output.stdout.pipe(opts.streams.stdout, { end: false })
  if (opts?.streams?.stderr) output.stderr.pipe(opts.streams.stderr, { end: false })
  return new ProcessOutputTrimmed(await output.proc)
}

export type ValuesArgs = {
  filesOnly?: boolean
}
export const hfValues = async ({ filesOnly = false }: ValuesArgs = {}): Promise<Record<string, any> | undefined> => {
  const d = terminal('hfValues')
  if (!(existsSync(`${env().ENV_DIR}/env/teams.yaml`) && existsSync(`${env().ENV_DIR}/env/settings.yaml`))) {
    // teams and settings file are the minimum needed files to run env().gotmpl and get the values
    d.info('No teams or cluster info found. ENV_DIR is potentially empty.')
    return undefined
  }
  let output
  console.trace()

  if (filesOnly) output = await hf({ fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-files.yaml`, args: 'build' })
  else output = await hf({ fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-all.yaml`, args: 'build' })
  const res = (load(replaceHFPaths(output.stdout)) as any).renderedvalues
  return res
}

export const hfTemplate = async (argv: HelmArguments, outDir?: string, streams?: Streams): Promise<string> => {
  const debug = terminal('hfTemplate')
  process.env.QUIET = '1'
  const args = ['template', '--skip-deps']
  if (outDir) args.push(`--output-dir=${outDir}`)
  if (argv.skipCleanup) args.push('--skip-cleanup')
  if (argv.args) args.push(`--args='${argv.args}'`)
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
