import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { BasicArguments, HelmArguments, getParsedArgs, helmOptions, setParsedArgs } from 'src/common/yargs'
import { ProcessOutputTrimmed, stream } from 'src/common/zx-enhance'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'

const cmdName = getFilename(__filename)
const templateFile = '/tmp/otomi/destroy-template.yaml'

export interface Arguments extends BasicArguments {
  full?: boolean
}

const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  if (existsSync(templateFile)) unlinkSync(templateFile)
}

const setup = (argv: HelmArguments): void => {
  cleanupHandler(() => cleanup(argv))
}

const destroyAll = async () => {
  const argv = getParsedArgs()
  const d = terminal(`cmd:${cmdName}:destroyAll`)
  d.log('Uninstalling otomi...')
  const debugStream = { stdout: d.stream.debug, stderr: d.stream.error }
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

  d.info('Uninstalling webhook mutatingwebhookconfiguration ...')
  await stream(nothrow($`kubectl delete mutatingwebhookconfiguration istio-sidecar-injector`), debugStream)

  d.info('Uninstalling webhook validatingwebhookconfiguration ...')

  const validationAdmissionControllers = [
    'cert-manager-webhook',
    'cnpg-validating-webhook-configuration',
    'config.webhook.istio.networking.internal.knative.dev',
    'config.webhook.pipeline.tekton.dev',
    'config.webhook.serving.knative.dev',
    'istio-validator-istio-system',
    'validation-webhook.snapshot.storage.k8s.io',
    'validation.webhook.domainmapping.serving.knative.dev',
    'validation.webhook.pipeline.tekton.dev',
    'validation.webhook.serving.knative.dev',
  ]

  await Promise.allSettled(
    validationAdmissionControllers.map(async (val) =>
      stream(
        nothrow($`kubectl delete validatingwebhookconfiguration.admissionregistration.k8s.io ${val}`),
        debugStream,
      ),
    ),
  )

  const mutatingAdminionControllers = [
    'cert-manager-webhook',
    'cnpg-mutating-webhook-configuration',
    'istio-sidecar-injector',
    'webhook.domainmapping.serving.knative.dev',
    'webhook.istio.networking.internal.knative.dev',
    'webhook.pipeline.tekton.dev',
    'webhook.serving.knative.dev',
  ]

  await Promise.allSettled(
    mutatingAdminionControllers.map(async (val) =>
      stream(nothrow($`kubectl delete mutatingwebhookconfigurations.admissionregistration.k8s.io ${val}`), debugStream),
    ),
  )

  const templateOutput: string = output.stdout
  writeFileSync(templateFile, templateOutput)
  await stream(nothrow($`kubectl delete -f ${templateFile}`), debugStream)
  d.info('Uninstalled all manifests.')
  if (!argv.full) return
  d.info('Uninstalling CRDs...')
  const ourCRDS = [
    'argoproj.io',
    'appgw.ingress.k8s.io',
    'cert-manager.io',
    'externalsecrets.kubernetes-client.io',
    'gatekeeper.sh',
    'istio.io',
    'jaegers.jaegertracing.io',
    'kiali.io',
    'knative.dev',
    'monitoring.coreos.com',
    'vault.banzaicloud.com',
  ]
  const kubeCRDString: string = (await $`kubectl get crd`).stdout.trim()
  const kubeCRDS: string[] = kubeCRDString.split('\n')
  const allOurCRDS: string[] = kubeCRDS
    .filter(
      (crd) =>
        ourCRDS.filter((ourCRD) => {
          return crd.includes(ourCRD)
        }).length > 0,
    )
    .map((val) => val.split(' ')[0])
    .filter(Boolean)
  d.info('Our CRDs will be removed: ', allOurCRDS)
  await Promise.allSettled(allOurCRDS.map(async (val) => stream(nothrow($`kubectl delete crd ${val}`), debugStream)))
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
  builder: (parser: Argv): Argv =>
    helmOptions(
      parser.options({
        full: {
          boolean: true,
          default: false,
        },
      }),
    ),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    setup(argv)
    await destroy()
  },
}
