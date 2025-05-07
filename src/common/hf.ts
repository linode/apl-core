import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { has, set } from 'lodash'
import { parse } from 'yaml'
import { $, ProcessPromise } from 'zx'
import { logLevels, terminal } from './debug'
import { env } from './envalid'
import { getFileMaps, setValuesFile } from './repo'
import { asArray, extract, flattenObject, getValuesSchema, isCore, rootDir } from './utils'
import { getParsedArgs, HelmArguments } from './yargs'
import { ProcessOutputTrimmed, Streams } from './zx-enhance'

const replaceHFPaths = (output: string, envDir = env.ENV_DIR): string => output.replaceAll('../env', envDir)

type HFParams = {
  fileOpts?: string | string[] | null
  labelOpts?: string | string[] | null
  logLevel?: string | null
  args: string | string[]
}

const hfCore = (args: HFParams, envDir = env.ENV_DIR): ProcessPromise => {
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

export const hf = async (args: HFParams, opts?: HFOptions, envDir = env.ENV_DIR): Promise<ProcessOutputTrimmed> => {
  await setValuesFile(env.ENV_DIR)
  const proc: ProcessPromise = hfCore(args, envDir)
  if (opts?.streams?.stdout) proc.stdout.pipe(opts.streams.stdout, { end: false })
  if (opts?.streams?.stderr) proc.stderr.pipe(opts.streams.stderr, { end: false })
  const res = new ProcessOutputTrimmed(await proc)
  return res
}

export interface ValuesArgs {
  // Only files from values
  filesOnly?: boolean
  // FIXME: 'withWorkloadValues' should be renamed to 'withFiles' but it needs coordination with changes in apl-api
  withWorkloadValues?: boolean
  excludeSecrets?: boolean
  envDir?: string
  defaultValues?: boolean
}
export const hfValues = async (
  { filesOnly = false, excludeSecrets = false, withWorkloadValues = false, defaultValues = false }: ValuesArgs = {},
  envDir: string = env.ENV_DIR,
): Promise<Record<string, any> | undefined> => {
  let output: ProcessOutputTrimmed
  if (filesOnly)
    output = await hf(
      { fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-files.gotmpl`, args: 'build' },
      undefined,
      envDir,
    )
  else if (defaultValues)
    output = await hf(
      { fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-defaults.gotmpl`, args: 'build' },
      undefined,
      envDir,
    )
  else
    output = await hf(
      { fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-all.gotmpl`, args: 'build' },
      undefined,
      envDir,
    )
  const res = parse(replaceHFPaths(output.stdout, envDir)).renderedvalues
  if (excludeSecrets) {
    // strip secrets
    const schema = await getValuesSchema()
    const allSecrets = extract(schema, 'x-secret')
    const allSecretsPaths = Object.keys(flattenObject(allSecrets))
    allSecretsPaths.forEach((filePath) => {
      if (has(res, filePath)) set(res, filePath, '<redacted>')
    })
  }

  if (withWorkloadValues) {
    const files = await getStandaloneFiles(envDir)
    res.files = files
  }

  return res
}

// Get file content for those files that are not automatically loaded to the spec
export const getStandaloneFiles = async (envDir: string): Promise<Record<string, any>> => {
  const files = {}
  const maps = getFileMaps(envDir).filter((map) => map.loadToSpec === false)
  const pathGlobs = maps.map((fileMap) => {
    return fileMap.pathGlob
  })
  const filePaths = await glob(pathGlobs)

  await Promise.allSettled(
    filePaths.map(async (path) => {
      const relativePath = path.replace(`${envDir}/`, '')
      files[relativePath] = await readFile(path, 'utf8')
    }),
  )
  return files
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
  process.env.HELMFILE_V1MODE = 'true'
  // const args = ['template', '--validate']
  const args = ['template', '--include-needs']
  if (outDir) args.push(`--output-dir=${outDir}`)
  if (argv.skipCleanup || isCore) args.push('--skip-cleanup')
  const helmArgs = getHelmArgs(argv, ['--skip-tests'])
  args.push(...helmArgs)
  let template = ''
  const params: HFParams = { args, fileOpts: argv.file, labelOpts: argv.label, logLevel: argv.logLevel }
  if (!argv.f && !argv.l) {
    const file = 'helmfile.tpl/helmfile-init.yaml.gotmpl'
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
