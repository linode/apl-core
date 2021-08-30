import { mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { Argv, CommandModule } from 'yargs'
import { $, cd, nothrow } from 'zx'
import { env } from '../common/envalid'
import { hf, hfValues } from '../common/hf'
import { cleanupHandler, prepareEnvironment } from '../common/setup'
import {
  getFilename,
  getParsedArgs,
  logLevelString,
  OtomiDebugger,
  rootDir,
  setParsedArgs,
  terminal,
  waitTillAvailable,
} from '../common/utils'
import { isChart } from '../common/values'
import { Arguments as HelmArgs, helmOptions } from '../common/yargs-opts'
import { ProcessOutputTrimmed } from '../common/zx-enhance'
import { commit } from './commit'
import { Arguments as DroneArgs } from './gen-drone'

const cmdName = getFilename(import.meta.url)
const dir = '/tmp/otomi/'
const templateFile = `${dir}deploy-template.yaml`
let debug: OtomiDebugger

interface Arguments extends HelmArgs, DroneArgs {}

const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  rmdirSync(dir, { recursive: true })
}

const setup = (): void => {
  const argv: Arguments = getParsedArgs()
  cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  mkdirSync(dir, { recursive: true })
}

const commitOnFirstRun = async () => {
  cd(env.ENV_DIR)

  const healthUrl = (await $`git config --get remote.origin.url`).stdout.trim()
  debug.debug('healthUrl: ', healthUrl)
  const isCertStaging = (await hfValues()).charts?.['cert-manager']?.stage === 'staging'
  if (isCertStaging) {
    process.env.GIT_SSL_NO_VERIFY = 'true'
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
  await waitTillAvailable(healthUrl)

  if ((await nothrow($`git ls-remote`)).stdout.trim().length !== 0) return
  await commit()
  await nothrow($`kubectl -n otomi create cm otomi-status --from-literal=status='Installed'`)
  cd(rootDir)
}

const applyAll = async () => {
  const argv: Arguments = getParsedArgs()
  debug.info('Start apply all')
  const output: ProcessOutputTrimmed = await hf(
    { fileOpts: 'helmfile.tpl/helmfile-init.yaml', args: 'template' },
    { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )
  if (output.exitCode > 0) {
    debug.error(output.stderr)
    process.exit(output.exitCode)
  } else if (output.stderr.length > 0) {
    debug.error(output.stderr)
  }
  const templateOutput = output.stdout
  writeFileSync(templateFile, templateOutput)
  await $`kubectl apply -f ${templateFile}`
  await $`kubectl apply -f charts/prometheus-operator/crds`
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps'],
    },
    { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )

  if (!isChart && !env.CI) await commitOnFirstRun()
}

export const apply = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  if (!argv.label && !argv.file) {
    await applyAll()
    return
  }
  debug.info('Start apply')
  const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps', skipCleanup],
    },
    { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    setup()
    await prepareEnvironment()
    await apply()
  },
}

export default module
