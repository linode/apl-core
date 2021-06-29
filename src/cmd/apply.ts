import { existsSync, mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { Argv, CommandModule } from 'yargs'
import { $ } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { giteaPush } from '../common/gitea-push'
import { Arguments as HelmArgs, helmOptions } from '../common/helm-opts'
import { hf, hfTrimmed, hfValues } from '../common/hf'
import { ENV, LOG_LEVEL_STRING } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { decrypt } from './decrypt'
import { Arguments as DroneArgs, genDrone } from './gen-drone'

const fileName = 'apply'
const dir = '/tmp/otomi/'
const templateFile = `${dir}/deploy-template.yaml`
const ssl = `${dir}/ssl`
let debug: OtomiDebugger

interface Arguments extends HelmArgs, DroneArgs {}

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
  rmdirSync(dir, { recursive: true })
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
  await decrypt(argv)
  mkdirSync(dir, { recursive: true })
}

const genDemoMtlsCertSecret = async () => {
  const hfVals = await hfValues()
  const root = hfVals.cluster.domainSuffix
  const dom = `tlspass.${root}`
  if (existsSync(`${ssl}/${root}.crt`)) return
  mkdirSync(ssl, { recursive: true })

  // for demonstration of mtls passthrough
  // see https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-sni-passthrough/
  await $`openssl req -out ${ssl}/${dom}.csr -newkey rsa:2048 -nodes -keyout ${ssl}/${dom}.key -subj '/CN=${dom}/O=some organization' -sha256`
  await $`openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -subj '/O=example Inc./CN=example.com' -keyout ${ssl}/${root}.key -out ${ssl}/${root}.crt -sha256`
  await $`openssl x509 -req -days 365 -CA ${ssl}/${root}.crt -CAkey ${ssl}/${root}.key -set_serial 0 -in ${ssl}/${dom}.csr -out ${ssl}/${dom}.crt -sha256`

  // try to create the secret if it does not yet exist
  try {
    await $`kubectl get ns team-demo`
    await $`kubectl -n team-demo get secret nginx-server-certs`
  } catch (error) {
    await $`kubectl -n team-demo create secret tls nginx-server-certs --key ${ssl}/${dom}.key --cert ${ssl}/${dom}.crt`
  }
}

const deployAll = async (argv: Arguments) => {
  if (!ENV.isCI) {
    await genDemoMtlsCertSecret()
  }
  const templateOutput: string = await hf({ fileOpts: 'helmfile.tpl/helmfile-init.yaml', args: 'template' })
  writeFileSync(templateFile, templateOutput)
  await $`kubectl apply -f ${templateFile}`
  await $`kubectl apply -f charts/prometheus-operator/crds`
  hf({
    fileOpts: argv.file,
    labelOpts: [...(argv.label ?? []), 'stage!=post'],
    logLevel: LOG_LEVEL_STRING(),
    args: ['apply', '--skip-deps'],
  })
  if (!ENV.isCI) {
    await genDrone(argv)
    await giteaPush(debug)
  }
  hf({
    fileOpts: argv.file,
    labelOpts: [...(argv.label ?? []), 'stage=post'],
    logLevel: LOG_LEVEL_STRING(),
    args: ['apply', '--skip-deps'],
  })
}

export const apply = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  await decrypt(argv)
  if (argv._[0] === 'deploy' || (!argv.label && !argv.file)) {
    debug.verbose('Start deploy')
    await deployAll(argv)
  } else {
    debug.verbose('Start apply')
    const skipCleanup = argv['skip-cleanup'] ? '--skip-cleanup' : ''
    const output = await hfTrimmed({
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: LOG_LEVEL_STRING(),
      args: ['apply', '--skip-deps', skipCleanup],
    })
    debug.verbose(output)
  }
}

export const module: CommandModule = {
  command: fileName,
  aliases: ['deploy'],
  describe: 'Apply K8S resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    await apply(argv, { skipDecrypt: true })
  },
}

export default module
