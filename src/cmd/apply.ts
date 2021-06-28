import { existsSync, mkdirSync, rmdirSync, writeFileSync } from 'fs'
import { Argv, CommandModule } from 'yargs'
import { $, cd, nothrow } from 'zx'
import {
  ask,
  cleanupHandler,
  ENV,
  hf,
  hfTrimmed,
  hfValues,
  LOG_LEVEL_STRING,
  otomi,
  OtomiDebugger,
  PrepareEnvironmentOptions,
  terminal,
} from '../common/index'
import { Arguments as HelmArgs, helmOptions } from '../helm.opts'
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

const giteaPush = async () => {
  debug.verbose('Gitea push')
  const hfVals = await hfValues()
  if (!hfVals.charts?.gitea?.enabled) {
    debug.verbose('Gitea is disabled')
    return
  }
  const stage = hfVals.charts?.['cert-manager']?.stage === 'staging' ? ' -c http.sslVerify=false' : ' '
  debug.log(hfVals.cluster)
  const clusterDomain = hfVals.cluster?.domainSuffix ?? debug.exit(1, 'cluster.domainSuffix is not set')
  const giteaUrl = `gitea.${clusterDomain}`
  const giteaPassword =
    hfVals.charts?.gitea?.adminPassword ??
    hfVals.otomi?.adminPassword ??
    debug.exit(1, 'otomi.adminPassword is not set')
  const giteaUser = 'otomi-admin'
  const giteaOrg = 'otomi'
  const giteaRepo = 'values'

  const currDir = (await $`pwd`).stdout.trim()
  cd(`${ENV.DIR}`)
  try {
    let gitFound = true
    if (!existsSync('.git')) {
      await $`git init`
      await $`git checkout -b main`
      gitFound = false
    }
    const remotes = (await $`git remote -v`).stdout
      .trim()
      .split('\n')
      .filter((item) => item.includes('push') && item.includes(giteaUrl))
    let remoteOrigin = !remotes.length ? 'origin' : remotes[0].split(/\s/)[0]

    let remoteOriginUrl = (await nothrow($`git config remote.${remoteOrigin}.url`)).stdout.trim()
    if (!!remoteOriginUrl.length && !remoteOriginUrl.includes(giteaUrl)) {
      const yes = ['y', 'yes']
      const options = [...yes, 'n', 'no']
      const addExtraRemote = await ask(
        'Another origin already exists, do you want to add Gitea as a remote? [yes/No]',
        {
          choices: ['Yes', 'No'],
          matching: options,
        },
      )
      if (yes.includes(addExtraRemote)) {
        remoteOrigin = 'otomi-values'
      } else {
        debug.error('Other origin already exists, and no new remote is added, cannot continue')
        return
      }
    }
    remoteOriginUrl = (await nothrow($`git config remote.${remoteOrigin}.url`)).stdout.trim()
    if (!remoteOriginUrl.length) {
      await $`git remote add ${remoteOrigin} "https://${giteaUser}:${giteaPassword}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git"`
      debug.log('Added gitea as a remote origin')
      debug.log(`You can push using: \`git push main ${remoteOrigin}\``)
    }

    try {
      await $`git${stage} fetch ${remoteOrigin} main >/dev/null`
      if (!gitFound) {
        await $`git config user.name "Otomi Admin"`
        await $`git config user.email "otomi-admin@${clusterDomain}"`
      }

      await $`git add -A`
      await $`git commit --no-verify -m "Automated commit of otomi-values"`
      await $`git${stage} push -u ${remoteOrigin} main -f`
      debug.log('Otomi-values has been pushed to gitea')
    } catch (error) {
      debug.error('There is already data in gitea.')
    }
  } catch (error) {
    debug.error(error)
  } finally {
    cd(currDir)
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
    await giteaPush()
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
