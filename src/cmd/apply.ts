import { mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { Argv, CommandModule } from 'yargs'
import { $ } from 'zx'
import { hf, hfStream } from '../common/hf'
import { cleanupHandler, prepareEnvironment, PrepareEnvironmentOptions } from '../common/setup'
import { getFilename, getParsedArgs, logLevelString, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { Arguments as HelmArgs, helmOptions } from '../common/yargs-opts'
import { ProcessOutputTrimmed } from '../common/zx-enhance'
import { Arguments as DroneArgs } from './gen-drone'

const cmdName = getFilename(import.meta.url)
const dir = '/tmp/otomi/'
const templateFile = `${dir}deploy-template.yaml`
let debug: OtomiDebugger

interface Arguments extends HelmArgs, DroneArgs {}

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  rmdirSync(dir, { recursive: true })
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await prepareEnvironment(options)
  mkdirSync(dir, { recursive: true })
}

const applyAll = async (argv: Arguments) => {
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
}

export const apply = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  if (!argv.label && !argv.file) {
    await applyAll(argv)
    return
  }
  debug.info('Start apply')
  const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
  await hfStream(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps', skipCleanup],
    },
    { trim: true, streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await setup(argv, {})
    await apply()
  },
}

export default module
