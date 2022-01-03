import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { cleanupHandler, prepareEnvironment } from '../common/cli'
import { logLevelString, terminal } from '../common/debug'
import { hf } from '../common/hf'
import { getFilename } from '../common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from '../common/yargs'
import { ProcessOutputTrimmed, stream } from '../common/zx-enhance'

const cmdName = getFilename(__filename)
const templateFile = '/tmp/otomi/destroy-template.yaml'

const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  if (existsSync(templateFile)) unlinkSync(templateFile)
}

const setup = (argv: HelmArguments): void => {
  cleanupHandler(() => cleanup(argv))
}

const destroyAll = async () => {
  const d = terminal(`cmd:${cmdName}:destroyAll`)
  d.log('Uninstalling otomi...')
  const debugStream = { stdout: d.stream.debug, stderr: d.stream.error }
  d.info('Removing problematic part: olm deployments...')
  await stream(nothrow($`kubectl -n olm delete deploy --all`), debugStream)
  d.info('Removing problematic part: kiali finalizer...')
  await stream(
    nothrow($`kubectl -n kiali patch kiali kiali -p '{"metadata":{"finalizers": []}}' --type=merge`),
    debugStream,
  )
  d.info('Uninstalling all charts...')
  await hf({ args: 'destroy' }, { streams: debugStream })
  d.info('Uninstalled all charts.')
  d.info('Uninstalling applied manifests...')
  const output: ProcessOutputTrimmed = await hf(
    { fileOpts: 'helmfile.tpl/helmfile-init.yaml', args: 'template' },
    { streams: debugStream },
  )
  if (output.exitCode > 0 || output.stderr.length > 0) {
    d.error(output.stderr)
  }
  const templateOutput: string = output.stdout
  writeFileSync(templateFile, templateOutput)
  await stream(nothrow($`kubectl delete -f ${templateFile}`), debugStream)
  d.info('Uninstalled all manifests.')
  d.info('Uninstalling CRDs...')

  const ourCRDS = [
    'appgw.ingress.k8s.io',
    'cert-manager.io',
    'externalsecrets.kubernetes-client.io',
    'gatekeeper.sh',
    'istio.io',
    'knative.dev',
    'kubeapps.com',
    'monitoring.coreos.com',
    'monitoring.kiali.io',
    'operators.coreos.com',
    'vault.banzaicloud.com',
  ]
  const kubeCRDString: string = (await $`kubectl get crd`).stdout.trim()
  const kubeCRDS: string[] = kubeCRDString.split('\n')
  const allOurCRDS: string[] = kubeCRDS
    .filter((crd) => ourCRDS.filter((ourCRD) => ourCRD.includes(crd)).length > 0)
    .map((val) => val.split(' ')[0])
    .filter(Boolean)
  await Promise.allSettled(allOurCRDS.map(async (val) => stream(nothrow($`kubectl delete crd ${val}`), debugStream)))
  d.info('Removing problematic api service: v1.packages.operators.coreos.com...')
  await stream(
    nothrow($`kubectl delete apiservices.apiregistration.k8s.io v1.packages.operators.coreos.com`),
    debugStream,
  )
  d.log('Uninstalled otomi!')
}

const destroy = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:destroy`)
  const argv: HelmArguments = getParsedArgs()
  d.info('Start destroy')
  if (!argv.label && !argv.file) {
    await destroyAll()
  } else {
    await hf(
      {
        fileOpts: argv.file,
        labelOpts: argv.label,
        logLevel: logLevelString(),
        args: 'destroy',
      },
      { streams: { stdout: d.stream.log, stderr: d.stream.error } },
    )
  }
}

export const module = {
  command: cmdName,
  describe: 'Destroy all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    setup(argv)
    await destroy()
  },
}
