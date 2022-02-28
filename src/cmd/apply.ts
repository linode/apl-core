import { mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { isIPv6 } from 'net'
import { Argv, CommandModule } from 'yargs'
import { $, nothrow } from 'zx'
import { cleanupHandler, prepareEnvironment } from '../common/cli'
import { logLevelString, terminal } from '../common/debug'
import { isCli } from '../common/envalid'
import { hf, hfValues } from '../common/hf'
import { getOtomiLoadBalancerIP } from '../common/k8s'
import { getFilename } from '../common/utils'
import { writeValues } from '../common/values'
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

const setDomainSuffix = async (values: Record<string, any>): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:setDomainSuffix`)
  d.debug("Create a fallback cluster.domainSuffix when it doesn't exist")
  const ingressIP = values.charts['nginx-ingress']?.loadBalancerIP ?? (await getOtomiLoadBalancerIP())
  // When ingressIP is V6, we need to use sslip.io as they resolve it, otherwise use nip.io as it uses PowerDNS
  const newSuffix = isIPv6(ingressIP) ? `${ingressIP.replaceAll(':', '-')}.sslip.io` : `${ingressIP}.nip.io`

  await writeValues({
    cluster: {
      domainSuffix: newSuffix,
    },
  })
}

const prepareValues = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:prepareValues`)

  const values = await hfValues()
  d.info('Checking if domainSuffix needs a fallback domain')
  if (values && !values.cluster.domainSuffix) {
    d.info('cluster.domainSuffix was not found, creating $loadbalancerIp.nip.io as fallback')
    await setDomainSuffix(values)
  }
}

const applyAll = async () => {
  const d = terminal(`cmd:${cmdName}:applyAll`)
  const argv: HelmArguments = getParsedArgs()
  d.info('Start apply all')
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
  await $`kubectl apply -f charts/prometheus-operator/crds`
  d.info('Deploying charts containing label stage=prep')
  await hf(
    {
      fileOpts: 'helmfile.d/helmfile-02.init.yaml',
      labelOpts: [...(argv.label || []), 'stage=prep'],
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps'],
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )
  await prepareValues()
  d.info('Deploying charts containing label stage!=prep')
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: [...(argv.label || []), 'stage!=prep'],
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps'],
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )
}

const apply = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:applyAll`)
  const argv: HelmArguments = getParsedArgs()
  if (!argv.label && !argv.file) {
    await applyAll()
    if (isCli) await commit()
    return
  }
  d.info('Start apply')
  const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['apply', '--skip-deps', skipCleanup],
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
    try {
      await apply()
    } catch (error) {
      if (error.exitCode === 1) {
        const d = terminal(`cmd:${cmdName}:k8s:events`)
        const res = await nothrow($`kubectl get events -A --sort-by='.lastTimestamp'`)
        if (res.exitCode === 0) d.warn(res.stdout)
        else d.error('Unable to fetch kubernetes events')
      }
      throw error
    }
  },
}
