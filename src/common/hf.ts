import { existsSync } from 'fs'
import { load } from 'js-yaml'
import { omit } from 'lodash'
import { $, ProcessOutput, ProcessPromise } from 'zx'
import { logLevels, terminal } from './debug'
import { env } from './envalid'
import { asArray, extract, flattenObject, getValuesSchema, rootDir } from './utils'
import { getParsedArgs, HelmArguments } from './yargs'
import { ProcessOutputTrimmed, Streams } from './zx-enhance'

const replaceHFPaths = (output: string): string => output.replaceAll('../env', env.ENV_DIR)

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

  const labels = paramsCopy.labelOpts?.map((item: string) => `-l=${item}`)
  const files = paramsCopy.fileOpts?.map((item: string) => `-f=${item}`)

  const stringArray = [...(labels ?? []), ...(files ?? [])]

  stringArray.push(`--log-level=${paramsCopy.logLevel.toLowerCase()}`)
  process.env.HELM_DIFF_COLOR = 'true'
  process.env.HELM_DIFF_USE_UPGRADE_DRY_RUN = 'true'
  const proc = $`helmfile ${stringArray} ${paramsCopy.args}`
  return proc
}

type HFOptions = {
  streams?: Streams
}

export const hf = async (args: HFParams, opts?: HFOptions): Promise<ProcessOutputTrimmed> => {
  const proc: ProcessPromise<ProcessOutput> = hfCore(args)
  if (opts?.streams?.stdout) proc.stdout.pipe(opts.streams.stdout, { end: false })
  if (opts?.streams?.stderr) proc.stderr.pipe(opts.streams.stderr, { end: false })
  return new ProcessOutputTrimmed(await proc)
}

export interface ValuesArgs {
  filesOnly?: boolean
  excludeSecrets?: boolean
}

export const hfValues = async ({ filesOnly = false, excludeSecrets = false }: ValuesArgs = {}): Promise<
  Record<string, any> | undefined
> => {
  const d = terminal('common:hf:hfValues')
  if (!(existsSync(`${env.ENV_DIR}/env/teams.yaml`) && existsSync(`${env.ENV_DIR}/env/settings.yaml`))) {
    // teams and settings file are the minimum needed files to run env.gotmpl and get the values
    d.info('No teams or cluster info found. ENV_DIR is potentially empty.')
    return undefined
  }
  let output
  if (filesOnly) output = await hf({ fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-files.yaml`, args: 'build' })
  else output = await hf({ fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-all.yaml`, args: 'build' })
  const res = (load(replaceHFPaths(output.stdout)) as any).renderedvalues
  if (excludeSecrets) {
    // strip secrets
    const schema = await getValuesSchema()
    const allSecrets = extract(schema, 'x-secret')
    return omit(res, Object.keys(flattenObject(allSecrets)))
  }
  return res
}

export const getHelmArgs = (argv: HelmArguments, args: string[] = []): string[] => {
  const argsArr: string[] = args
  if (argv.args) argsArr.push(argv.args)
  if (argv.kubeVersion) argsArr.push(`--kube-version=${argv.kubeVersion}`)
  return ['--args', argsArr.join(' ')]
}

export const hfTemplate = async (argv: HelmArguments, outDir?: string, streams?: Streams): Promise<string> => {
  const d = terminal('common:hf:hfTemplate')
  process.env.QUIET = '1'
  // const args = ['template', '--validate']
  const args = ['template']
  if (outDir) args.push(`--output-dir=${outDir}`)
  if (argv.skipCleanup) args.push('--skip-cleanup')
  const helmArgs = getHelmArgs(argv, ['--skip-tests'])
  args.push(...helmArgs)
  let template = ''
  const params: HFParams = { args, fileOpts: argv.file, labelOpts: argv.label, logLevel: argv.logLevel }
  if (!argv.f && !argv.l) {
    const file = 'helmfile.tpl/helmfile-init.yaml'
    d.debug(`Templating ${file} started`)
    const outInit = await hf({ ...params, fileOpts: file }, { streams })
    d.debug(`Templating ${file} done`)
    template += outInit.stdout
    template += '\n'
  }
  d.debug('Templating charts started')
  const outAll = await hf(params, { streams })
  d.debug('Templating charts done')
  template += outAll.stdout
  return template
}
