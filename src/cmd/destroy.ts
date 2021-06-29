import { unlinkSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $ } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { Arguments, helmOptions } from '../common/helm.opts'
import { hf, hfTrimmed } from '../common/hf'
import { LOG_LEVEL_STRING } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { decrypt } from './decrypt'

const fileName = 'destroy'
const templateFile = '/tmp/otomi/destroy-template.yaml'
let debug: OtomiDebugger

const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
  unlinkSync(templateFile)
}

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
  await decrypt(argv)
}

const destroyAll = async () => {
  await $`kubectl -n olm delete deploy --all`
  await hf({ args: 'destroy' })

  const templateOutput: string = await hf({ fileOpts: 'helmfile.tpl/helmfile-init.yaml', args: 'template' })
  writeFileSync(templateFile, templateOutput)
  await $`kubectl delete -f ${templateFile}`

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
  Promise.allSettled(allOurCRDS.map(async (val) => $`kubectl delete crd ${val}`))
  await $`kubectl delete apiservices.apiregistration.k8s.io v1.packages.operators.coreos.com`
}

export const destroy = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  await decrypt(argv)
  debug.verbose('Start destroy')
  if (!argv.label && !argv.file) {
    destroyAll()
  } else {
    const output = await hfTrimmed({
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: LOG_LEVEL_STRING(),
      args: 'destroy',
    })
    debug.verbose(output)
  }
}

export const module = {
  command: fileName,
  describe: 'Destroy all or some charts',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    await destroy(argv, { skipDecrypt: true })
  },
}

export default module
