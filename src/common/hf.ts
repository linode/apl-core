import { pathExists } from 'fs-extra'
import { readFile } from 'fs/promises'
import { has, set } from 'lodash'
import { parse } from 'yaml'
import { $, ProcessOutput, ProcessPromise } from 'zx'
import { logLevels, terminal } from './debug'
import { env } from './envalid'
import { asArray, extract, flattenObject, getValuesSchema, isCore, readdirRecurse, rootDir } from './utils'
import { HelmArguments, getParsedArgs } from './yargs'
import { ProcessOutputTrimmed, Streams } from './zx-enhance'

const replaceHFPaths = (output: string, envDir = env.ENV_DIR): string => output.replaceAll('../env', envDir)

type HFParams = {
  fileOpts?: string | string[] | null
  labelOpts?: string | string[] | null
  logLevel?: string | null
  args: string | string[]
}

const hfCore = (args: HFParams, envDir = env.ENV_DIR): ProcessPromise<ProcessOutput> => {
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
  const proc = $`ENV_DIR=${envDir} helmfile ${stringArray} ${paramsCopy.args}`
  return proc
}

type HFOptions = {
  streams?: Streams
}

export const hf = async (args: HFParams, opts?: HFOptions, envDir?: string): Promise<ProcessOutputTrimmed> => {
  const proc: ProcessPromise<ProcessOutput> = hfCore(args, envDir)
  if (opts?.streams?.stdout) proc.stdout.pipe(opts.streams.stdout, { end: false })
  if (opts?.streams?.stderr) proc.stderr.pipe(opts.streams.stderr, { end: false })
  return new ProcessOutputTrimmed(await proc)
}

export interface ValuesArgs {
  // Only files from values
  filesOnly?: boolean
  withWorkloadValues?: boolean
  excludeSecrets?: boolean
  envDir?: string
}
export const hfValues = async (
  { filesOnly = false, excludeSecrets = false, withWorkloadValues = false }: ValuesArgs = {},
  envDir: string = env.ENV_DIR,
): Promise<Record<string, any> | undefined> => {
  const d = terminal('common:hf:hfValues')
  if (!(await Promise.all([pathExists(`${envDir}/env/teams.yaml`), pathExists(`${envDir}/env/settings.yaml`)]))) {
    // teams and settings file are the minimum needed files to run env.gotmpl and get the values
    d.info('No teams or cluster info found. ENV_DIR is potentially empty.')
    return undefined
  }
  let output: ProcessOutputTrimmed
  if (filesOnly)
    output = await hf(
      { fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-files.yaml`, args: 'build' },
      undefined,
      envDir,
    )
  else
    output = await hf({ fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-all.yaml`, args: 'build' }, undefined, envDir)
  const res = parse(replaceHFPaths(output.stdout, envDir)).renderedvalues
  if (excludeSecrets) {
    // strip secrets
    const schema = await getValuesSchema()
    const allSecrets = extract(schema, 'x-secret')
    const allSecretsPaths = Object.keys(flattenObject(allSecrets))
    allSecretsPaths.forEach((path) => {
      if (has(res, path)) set(res, path, '<redacted>')
    })
  }

  if (withWorkloadValues) {
    const tragetDir = `${envDir}/env/teams/workloads`
    const files = {}
    if (await pathExists(tragetDir)) {
      const paths = await readdirRecurse(tragetDir)
      await Promise.allSettled(
        paths.map(async (path) => {
          const relativePath = path.replace(`${envDir}/`, '')
          files[relativePath] = (await readFile(path)).toString()
        }),
      )
      res.files = files
    }
  }
  return res
}

export const getHelmArgs = (argv: HelmArguments, args: string[] = []): string[] => {
  const argsArr: string[] = args
  if (argv.args) argsArr.push(argv.args)
  if (argv.kubeVersion) argsArr.push(`--kube-version=${argv.kubeVersion}`)
  return ['--args', argsArr.join(' ')]
}

export const hfTemplate = async (
  argv: HelmArguments,
  outDir?: string,
  streams?: Streams,
  envDir?: string,
): Promise<string> => {
  const d = terminal('common:hf:hfTemplate')
  process.env.QUIET = '1'
  // const args = ['template', '--validate']
  const args = ['template', '--include-needs']
  if (outDir) args.push(`--output-dir=${outDir}`)
  if (argv.skipCleanup || isCore) args.push('--skip-cleanup')
  const helmArgs = getHelmArgs(argv, ['--skip-tests'])
  args.push(...helmArgs)
  let template = ''
  const params: HFParams = { args, fileOpts: argv.file, labelOpts: argv.label, logLevel: argv.logLevel }
  if (!argv.f && !argv.l) {
    const file = 'helmfile.tpl/helmfile-init.yaml'
    d.debug(`# Templating ${file} started`)
    const outInit = await hf({ ...params, fileOpts: file }, { streams }, envDir)
    d.debug(`# Templating ${file} done`)
    template += outInit.stdout
    template += '\n'
  }
  d.debug('# Templating charts started')
  const outAll = await hf(params, { streams }, envDir)
  d.debug('# Templating charts done')
  template += outAll.stdout
  return template
}
