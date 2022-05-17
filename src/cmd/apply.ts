import { mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { Argv, CommandModule } from 'yargs'
import { $, nothrow } from 'zx'
import { prepareDomainSuffix } from '../common/bootstrap'
import { cleanupHandler, prepareEnvironment } from '../common/cli'
import { logLevelString, terminal } from '../common/debug'
import { env, isChart } from '../common/envalid'
import { hf } from '../common/hf'
import { getDeploymentState, setDeploymentState } from '../common/k8s'
import { getFilename } from '../common/utils'
import { getCurrentVersion, getImageTag } from '../common/values'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from '../common/yargs'
import { ProcessOutputTrimmed } from '../common/zx-enhance'
import { commit } from './commit'

const cmdName = getFilename(__filename)
const dir = '/tmp/otomi/'
const templateFile = `${dir}deploy-template.yaml`

const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  rmdirSync(dir, { recursive: true })
}

const setup = (): void => {
  const argv: HelmArguments = getParsedArgs()
  cleanupHandler(() => cleanup(argv))
  mkdirSync(dir, { recursive: true })
}

const applyAll = async () => {
  const d = terminal(`cmd:${cmdName}:applyAll`)
  const argv: HelmArguments = getParsedArgs()
  d.info('Start apply all')

  const prevState = await getDeploymentState()
  d.debug(`Deployment state: ${JSON.stringify(prevState)}`)
  const tag = await getImageTag()
  const version = await getCurrentVersion()
  await setDeploymentState({ status: 'deploying', deployingTag: tag, deployingVersion: version })

  const output: ProcessOutputTrimmed = await hf(
    { fileOpts: 'helmfile.tpl/helmfile-init.yaml', args: 'template' },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )
  if (output.exitCode > 0) {
    throw new Error(output.stderr)
  } else if (output.stderr.length > 0) {
    d.error(output.stderr)
  }
  const templateOutput = output.stdout
  writeFileSync(templateFile, templateOutput)
  await $`kubectl apply -f ${templateFile}`
  await nothrow(
    $`if ! kubectl replace -f charts/prometheus-operator/crds; then kubectl create -f charts/prometheus-operator/crds; fi`,
  )
  d.info('Deploying charts containing label stage=prep')
  await hf(
    {
      // 'fileOpts' limits the hf scope and avoids parse errors (we only have basic values in this statege):
      fileOpts: 'helmfile.d/helmfile-02.init.yaml',
      labelOpts: [...(argv.label || []), 'stage=prep'],
      logLevel: logLevelString(),
      args: ['apply'],
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )
  await prepareDomainSuffix()
  d.info('Deploying charts containing label stage!=prep')
  await hf(
    {
      labelOpts: [...(argv.label || []), 'stage!=prep'],
      logLevel: logLevelString(),
      args: ['apply'],
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )
  if (!env.DISABLE_SYNC)
    if (isChart || !prevState.status)
      // commit first time when not deployed only, always commit in chart (might have previous failure)
      await commit(true) // will set deployment state after
    else await setDeploymentState({ status: 'deployed' })
}

const apply = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:apply`)
  const argv: HelmArguments = getParsedArgs()
  if (!argv.label && !argv.file) {
    await applyAll()
    return
  }
  d.info('Start apply')
  const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['apply', skipCleanup],
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    setup()
    await prepareEnvironment()
    await apply()
  },
}
