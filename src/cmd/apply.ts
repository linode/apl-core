import retry, { Options } from 'async-retry'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { cloneDeep } from 'lodash'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { hf, HF_DEFAULT_SYNC_ARGS } from 'src/common/hf'
import {
  applyServerSide,
  getDeploymentState,
  getHelmReleases,
  k8s,
  restartOtomiApiDeployment,
  setDeploymentState,
} from 'src/common/k8s'
import { getFilename, rootDir } from 'src/common/utils'
import { getCurrentVersion, getImageTag, writeValuesToFile } from 'src/common/values'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { ProcessOutputTrimmed } from 'src/common/zx-enhance'
import { Argv, CommandModule } from 'yargs'
import { $, cd } from 'zx'
import { applyAsApps } from './apply-as-apps'
import {
  cloneOtomiChartsInGitea,
  commit,
  createCredentialsSecret,
  initialSetupData,
  printWelcomeMessage,
  retryIsOAuth2ProxyRunning,
} from './commit'
import { upgrade } from './upgrade'
import { runtimeUpgrade } from '../common/runtime-upgrade'

const cmdName = getFilename(__filename)
const dir = '/tmp/otomi/'
const templateFile = `${dir}deploy-template.yaml`

const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  rmSync(dir, { recursive: true })
}

const setup = (): void => {
  const argv: HelmArguments = getParsedArgs()
  cleanupHandler(() => cleanup(argv))
  mkdirSync(dir, { recursive: true })
}

const applyAll = async () => {
  const d = terminal(`cmd:${cmdName}:applyAll`)
  const prevState = await getDeploymentState()
  const argv: HelmArguments = getParsedArgs()
  const initialInstall = !argv.tekton
  const hfArgs = initialInstall ? HF_DEFAULT_SYNC_ARGS : ['apply', '--sync-args', '--qps=20']

  if (!initialInstall) {
    await upgrade({ when: 'pre' })
    await runtimeUpgrade({ when: 'pre' })
  }
  d.info('Start apply all')
  d.info(`Deployment state: ${JSON.stringify(prevState)}`)
  const tag = await getImageTag()
  const version = await getCurrentVersion()
  await setDeploymentState({ status: 'deploying', deployingTag: tag, deployingVersion: version })

  const state = await getDeploymentState()
  const releases = await getHelmReleases()
  await writeValuesToFile(`${env.ENV_DIR}/env/status.yaml`, { status: { otomi: state, helm: releases } }, true)

  const output: ProcessOutputTrimmed = await hf(
    { fileOpts: 'helmfile.tpl/helmfile-init.yaml.gotmpl', args: 'template' },
    { streams: { stderr: d.stream.error } },
  )
  if (output.exitCode > 0) {
    throw new Error(output.stderr)
  } else if (output.stderr.length > 0) {
    d.error(output.stderr)
  }
  const templateOutput = output.stdout
  writeFileSync(templateFile, templateOutput)

  d.info('Deploying CRDs')
  if (initialInstall) {
    await applyServerSide('charts/kube-prometheus-stack/charts/crds/crds')
  }
  await $`kubectl apply -f charts/tekton-triggers/crds --server-side`
  d.info('Deploying essential manifests')
  await $`kubectl apply -f ${templateFile}`
  let applyCompleted = false
  if (initialInstall) {
    d.info('Deploying charts containing label stage=prep')
    await hf(
      {
        // 'fileOpts' limits the hf scope and avoids parse errors (we only have basic values at this stage):
        fileOpts: 'helmfile.d/helmfile-02.init.yaml.gotmpl',
        labelOpts: ['stage=prep'],
        logLevel: logLevelString(),
        args: hfArgs,
      },
      { streams: { stdout: d.stream.log, stderr: d.stream.error } },
    )

    // When Otomi is installed for the very first time and ArgoCD is not yet there.
    // Only install the core apps
    await hf(
      {
        labelOpts: ['app=core'],
        logLevel: logLevelString(),
        args: hfArgs,
      },
      { streams: { stdout: d.stream.log, stderr: d.stream.error } },
    )
  } else {
    // When Otomi is already installed and Tekton pipeline performs GitOps.
    // We ensure that helmfile does not deploy any team related Helm release.

    // We still need to deploy all teams because some settings depend on platform apps.
    // Note that team-ns-admin contains ingress for platform apps.
    const params = cloneDeep(argv)
    applyCompleted = await applyAsApps(params)
  }
  if (!initialInstall) {
    if (applyCompleted) {
      await upgrade({ when: 'post' })
      await runtimeUpgrade({ when: 'post' })
    } else {
      d.info('Apply step not completed, skipping upgrade checks')
    }
  }
  if (!(env.isDev && env.DISABLE_SYNC)) {
    await commit(initialInstall)
    if (initialInstall) {
      await hf(
        {
          // 'fileOpts' limits the hf scope and avoids parse errors (we only have basic values in this statege):
          fileOpts: `${rootDir}/helmfile.tpl/helmfile-e2e.yaml.gotmpl`,
          logLevel: logLevelString(),
          args: hfArgs,
        },
        { streams: { stdout: d.stream.log, stderr: d.stream.error } },
      )
      await cloneOtomiChartsInGitea()
      const initialData = await initialSetupData()
      await createCredentialsSecret(initialData.secretName, initialData.username, initialData.password)
      await retryIsOAuth2ProxyRunning()
      await restartOtomiApiDeployment(k8s.app())
      await printWelcomeMessage(initialData.secretName, initialData.domainSuffix)
    }
  }
  await setDeploymentState({ status: 'deployed', version })
  d.info('Deployment completed')
}

const apply = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:apply`)
  const argv: HelmArguments = getParsedArgs()
  const retryOptions: Options = {
    factor: 1,
    retries: 3,
    maxTimeout: 30000,
  }
  if (!argv.label && !argv.file) {
    await retry(async (bail) => {
      try {
        cd(rootDir)
        await applyAll()
      } catch (e) {
        d.error(e)
        d.info(`Retrying in ${retryOptions.maxTimeout} ms`)
        throw e
      }
    }, retryOptions)

    return
  }
  d.info('Start apply')
  const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
  if (argv.tekton) {
    await applyAsApps(argv)
  } else {
    await hf(
      {
        fileOpts: argv.file,
        labelOpts: argv.label,
        logLevel: logLevelString(),
        args: ['apply', '--include-needs', skipCleanup],
      },
      { streams: { stdout: d.stream.log, stderr: d.stream.error } },
    )
  }
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply all, or supplied, k8s resources',
  builder: (parser: Argv): Argv =>
    helmOptions(parser).option({
      tekton: {
        type: 'boolean',
        description: 'Apply flag when run in tekton pipeline',
        default: false,
      },
    }),
  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    setup()
    await prepareEnvironment()
    await apply()
  },
}
