import { mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { Argv, CommandModule } from 'yargs'
import { $ } from 'zx'
import { DEPLOYMENT_INFO_SECRET } from '../common/constants'
import { env } from '../common/envalid'
import { hf, hfValues } from '../common/hf'
import { cleanupHandler, prepareEnvironment } from '../common/setup'
import {
  getFilename,
  getOtomiLoadBalancerIP,
  getParsedArgs,
  logLevelString,
  OtomiDebugger,
  patchK8sSecret,
  setParsedArgs,
  terminal,
} from '../common/utils'
import { writeValues } from '../common/values'
import { Arguments as HelmArgs, helmOptions } from '../common/yargs-opts'
import { ProcessOutputTrimmed } from '../common/zx-enhance'
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

const setDomainSuffix = async (values: Record<string, any>): Promise<void> => {
  const d = terminal('apply:prepareValues')
  d.info("Create a fallback cluster.domainSuffix when it doesn't exist")
  const ingressIP = values.charts['nginx-ingress']?.loadBalancerIP ?? (await getOtomiLoadBalancerIP())
  const newSuffix = `${ingressIP}.nip.io`
  d.info(`cluster.domainSuffix is ${newSuffix} if it is not yet set.`)

  await writeValues({
    cluster: {
      domainSuffix: newSuffix,
    },
  })
  await patchK8sSecret(DEPLOYMENT_INFO_SECRET, env.DEPLOYMENT_NAMESPACE, {
    field: 'cluster_domainSuffix',
    data: newSuffix,
  })
}

const prepareValues = async (): Promise<void> => {
  const d = terminal('apply:prepareValues')

  const values = await hfValues()
  if (!values.cluster.domainSuffix) {
    await setDomainSuffix(values)
  }
}

const applyAll = async () => {
  const argv: Arguments = getParsedArgs()
  debug.info('Start apply all')
  const output: ProcessOutputTrimmed = await hf(
    { fileOpts: 'helmfile.tpl/helmfile-init.yaml', args: 'template' },
    { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )
  if (output.exitCode > 0) {
    throw new Error(output.stderr)
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
      labelOpts: [...(argv.label || []), 'stage=prep'],
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps'],
    },
    { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )
  await prepareValues()
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: [...(argv.label || []), 'stage!=prep'],
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps'],
    },
    { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )
}

const apply = async (): Promise<void> => {
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
