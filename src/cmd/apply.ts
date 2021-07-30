import { mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { Argv, CommandModule } from 'yargs'
import { $ } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { giteaPush } from '../common/gitea-push'
import { hf, hfStream } from '../common/hf'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { getFilename, logLevelString, setParsedArgs } from '../common/utils'
import { Arguments as HelmArgs, helmOptions } from '../common/yargs-opts'
import { ProcessOutputTrimmed } from '../common/zx-enhance'
import { Arguments as DroneArgs, genDrone } from './gen-drone'

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

  if (options) await otomi.prepareEnvironment(options)
  mkdirSync(dir, { recursive: true })
}

const deployAll = async (argv: Arguments) => {
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
      labelOpts: [...(argv.label ?? []), 'stage!=post'],
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps'],
    },
    { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )
  if (!env.CI) {
    await genDrone(argv)
    await giteaPush()
  }
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: [...(argv.label ?? []), 'stage=post'],
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps'],
    },
    { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )
}

export const apply = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  if (argv._[0] === 'deploy' || (!argv.label && !argv.file)) {
    debug.info('Start deploy')
    await deployAll(argv)
  } else {
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
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply K8S resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await apply(argv, {})
  },
}

export default module
