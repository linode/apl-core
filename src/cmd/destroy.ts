import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { hf, hfStream } from '../common/hf'
import { cleanupHandler, prepareEnvironment } from '../common/setup'
import { getFilename, getParsedArgs, logLevelString, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'
import { ProcessOutputTrimmed, stream } from '../common/zx-enhance'

const cmdName = getFilename(import.meta.url)
const templateFile = '/tmp/otomi/destroy-template.yaml'
const debug: OtomiDebugger = terminal(cmdName)

const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  if (existsSync(templateFile)) unlinkSync(templateFile)
}

const setup = (argv: Arguments): void => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
}

const destroyAll = async () => {
  debug.log('Uninstalling otomi...')
  const debugStream = { stdout: debug.stream.debug, stderr: debug.stream.error }
  debug.info('Removing problematic part: olm deployments...')
  await stream(nothrow($`kubectl -n olm delete deploy --all`), debugStream)
  debug.info('Removing problematic part: kiali finalizer...')
  await stream(
    nothrow($`kubectl -n kiali patch kiali kiali -p '{"metadata":{"finalizers": []}}' --type=merge`),
    debugStream,
  )
  debug.info('Uninstalling all charts...')
  await hf({ args: 'destroy' }, { streams: debugStream })
  debug.info('Uninstalled all charts.')
  debug.info('Uninstalling applied manifests...')
  const output: ProcessOutputTrimmed = await hf(
    { fileOpts: 'helmfile.tpl/helmfile-init.yaml', args: 'template' },
    { streams: debugStream },
  )
  if (output.exitCode > 0 || output.stderr.length > 0) {
    debug.error(output.stderr)
  }
  const templateOutput: string = output.stdout
  writeFileSync(templateFile, templateOutput)
  await stream(nothrow($`kubectl delete -f ${templateFile}`), debugStream)
  debug.info('Uninstalled all manifests.')
  debug.info('Uninstalling CRDs...')

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
  Promise.allSettled(allOurCRDS.map(async (val) => stream(nothrow($`kubectl delete crd ${val}`), debugStream)))
  debug.info('Removing problematic api service: v1.packages.operators.coreos.com...')
  await stream(
    nothrow($`kubectl delete apiservices.apiregistration.k8s.io v1.packages.operators.coreos.com`),
    debugStream,
  )
  debug.log('Uninstalled otomi!')
}

export const destroy = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  debug.info('Start destroy')
  if (!argv.label && !argv.file) {
    destroyAll()
  } else {
    await hfStream(
      {
        fileOpts: argv.file,
        labelOpts: argv.label,
        logLevel: logLevelString(),
        args: 'destroy',
      },
      { trim: true, streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
    )
  }
}

export const module = {
  command: cmdName,
  describe: 'Destroy all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    setup(argv)
    await destroy()
  },
}

export default module
