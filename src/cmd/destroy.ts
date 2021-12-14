import { existsSync, unlinkSync } from 'fs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { cleanupHandler, prepareEnvironment } from '../common/cli'
import { DEPLOYMENT_PASSWORDS_SECRET, DEPLOYMENT_STATUS_CONFIGMAP } from '../common/constants'
import { logLevelString, OtomiDebugger, terminal } from '../common/debug'
import { isChart } from '../common/envalid'
import { hf } from '../common/hf'
import { getFilename, loadYaml } from '../common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from '../common/yargs'
import { stream } from '../common/zx-enhance'

const cmdName = getFilename(__filename)
const templateFile = '/tmp/otomi/destroy-template.yaml'
const debug: OtomiDebugger = terminal(cmdName)

const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  if (existsSync(templateFile)) unlinkSync(templateFile)
}

const setup = (argv: HelmArguments): void => {
  cleanupHandler(() => cleanup(argv))
}

const destroyAll = async () => {
  debug.log('Uninstalling otomi (some errors are expected)...')
  const debugStream = { stdout: debug.stream.debug, stderr: debug.stream.error }
  debug.info('Removing problematic part: olm deployments...')
  await stream(nothrow($`kubectl -n olm delete deploy --all`), debugStream)
  debug.info('Removing problematic part: kiali finalizer...')
  await stream(
    nothrow($`kubectl -n kiali patch kiali kiali -p '{"metadata":{"finalizers": []}}' --type=merge`),
    debugStream,
  )
  debug.info('Uninstalling all charts...')
  await stream(
    nothrow($`helm ls -a -d --all-namespaces | awk 'NR > 1 { print "-n "$2, $1}' | xargs -L1 helm delete`),
    debugStream,
  )
  debug.info('Uninstalled all charts.')

  debug.info('Uninstalling applied manifests...')
  await stream(nothrow($`kubectl delete cm otomi-status`), debugStream)
  if (isChart) {
    debug.info('Uninstalling chart related manifests')
    await stream(nothrow($`kubectl delete cm ${DEPLOYMENT_STATUS_CONFIGMAP}`), debugStream)
    await stream(nothrow($`kubectl delete secret ${DEPLOYMENT_PASSWORDS_SECRET}`), debugStream)
  }
  debug.info('Uninstalled all manifests.')

  debug.info('Uninstalling namespaces...')
  const core = loadYaml(`${process.cwd()}/core.yaml`) as Record<string, any>
  const ourNamespaces = core.k8s.namespaces
  await Promise.allSettled(
    ourNamespaces.map(async (ns) => stream(nothrow($`kubectl delete ns ${ns.name}`), debugStream)),
  )
  debug.info('Uninstalled namespaces.')

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
  await Promise.allSettled(allOurCRDS.map(async (val) => stream(nothrow($`kubectl delete crd ${val}`), debugStream)))
  debug.info('Removing problematic api service: v1.packages.operators.coreos.com...')
  await stream(
    nothrow($`kubectl delete apiservices.apiregistration.k8s.io v1.packages.operators.coreos.com`),
    debugStream,
  )
  debug.log('Uninstalled otomi!')
}

const destroy = async (): Promise<void> => {
  const argv: HelmArguments = getParsedArgs()
  debug.info('Start destroy')
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
      { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
    )
  }
}

export const module = {
  command: cmdName,
  describe: 'Destroy all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    setup(argv)
    await destroy()
  },
}
