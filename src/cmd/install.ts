import retry, { Options } from 'async-retry'
import { mkdirSync, rmSync } from 'fs'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { deployEssential, hf, HF_DEFAULT_SYNC_ARGS } from 'src/common/hf'
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
import { Argv, CommandModule } from 'yargs'
import { $, cd } from 'zx'
import {
  cloneOtomiChartsInGitea,
  commit,
  createCredentialsSecret,
  createWelcomeConfigMap,
  initialSetupData,
  retryIsOAuth2ProxyRunning,
} from './commit'
import { collectTraces } from './traces'

const cmdName = getFilename(__filename)
const dir = '/tmp/otomi/'

const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  rmSync(dir, { recursive: true })
}

const setup = (): void => {
  const argv: HelmArguments = getParsedArgs()
  cleanupHandler(() => cleanup(argv))
  mkdirSync(dir, { recursive: true })
}

const retryInstallStep = async <T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  ...args: Args
): Promise<T> => {
  const d = terminal(`cmd:${cmdName}`)
  return await retry(
    async () => {
      return await fn(...args)
    },
    {
      retries: env.INSTALL_STEP_RETRIES,
      onRetry: async (e, attempt) => {
        d.info(`Retrying (${attempt}/${env.INSTALL_STEP_RETRIES})...`)
      },
    },
  )
}

function runPostInstallSteps(initialData: any) {
  void (async () => {
    const postInstallLogger = terminal(`cmd:${cmdName}:post-install`)
    try {
      postInstallLogger.info('Starting post-install steps...')

      await retryIsOAuth2ProxyRunning()
      postInstallLogger.info('OAuth2 proxy check completed successfully')

      await restartOtomiApiDeployment(k8s.app())
      postInstallLogger.info('API restart completed successfully')

      await createWelcomeConfigMap(initialData.secretName, initialData.domainSuffix)
      postInstallLogger.info('Welcome ConfigMap creation completed successfully')

      postInstallLogger.info('All post-install steps completed successfully')
    } catch (error) {
      postInstallLogger.error('Post-install steps failed:', error)
    }
  })()
}

export const installAll = async () => {
  const d = terminal(`cmd:${cmdName}:installAll`)
  const prevState = await getDeploymentState()
  const hfArgs = HF_DEFAULT_SYNC_ARGS

  d.info('Start install all')
  d.info(`Deployment state: ${JSON.stringify(prevState)}`)
  const tag = await getImageTag()
  const version = await getCurrentVersion()
  await setDeploymentState({ status: 'deploying', deployingTag: tag, deployingVersion: version })

  const state = await getDeploymentState()
  const releases = await getHelmReleases()
  await writeValuesToFile(`${env.ENV_DIR}/env/status.yaml`, { status: { otomi: state, helm: releases } }, true)

  d.info('Deploying essential manifests')
  const essentialDeployResult = await deployEssential()
  if (!essentialDeployResult) {
    throw new Error('Failed to deploy essential manifests')
  }

  d.info('Deploying CRDs')
  await applyServerSide('charts/kube-prometheus-stack/charts/crds/crds')
  await $`kubectl apply -f charts/tekton-triggers/crds --server-side`

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

  // Only install the core apps
  await hf(
    {
      labelOpts: ['app=core'],
      logLevel: logLevelString(),
      args: hfArgs,
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )

  if (!(env.isDev && env.DISABLE_SYNC)) {
    await commit(true)
    await cloneOtomiChartsInGitea()
    const initialData = await initialSetupData()
    await retryInstallStep(createCredentialsSecret, initialData.secretName, initialData.username, initialData.password)
    // FIXME: Migrate to use native Git client and stop cd-ing around
    cd(rootDir)
    await retryInstallStep(
      hf,
      {
        labelOpts: ['pkg=apl-operator'],
        logLevel: logLevelString(),
        args: hfArgs,
      },
      { streams: { stdout: d.stream.log, stderr: d.stream.error } },
    )
    await cloneOtomiChartsInGitea()
    await createCredentialsSecret(initialData.secretName, initialData.username, initialData.password)

    // Run post-install steps synchronously but asynchronously without blocking
    runPostInstallSteps(initialData)
  }
  await setDeploymentState({ status: 'deployed', version })
  d.info('Installation completed')
}

const install = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:install`)
  const argv: HelmArguments = getParsedArgs()
  const retryOptions: Options = {
    factor: 1,
    retries: env.INSTALL_RETRIES,
    minTimeout: env.INSTALL_RETRY_TIMEOUT,
    maxTimeout: env.INSTALL_RETRY_TIMEOUT,
  }
  if (!argv.label && !argv.file) {
    await retry(async () => {
      try {
        cd(rootDir)
        await installAll()
      } catch (e) {
        d.error(e)
        // Collect traces on installation failure
        try {
          await collectTraces()
        } catch (traceError) {
          d.error('Failed to collect traces:', traceError)
        }
        d.info(`Retrying in ${retryOptions.maxTimeout} ms`)
        throw e
      }
    }, retryOptions)

    return
  }
  d.info('Start install')
  const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
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

export const module: CommandModule = {
  command: cmdName,
  describe: 'Install all k8s resources for first-time setup',
  builder: (parser: Argv): Argv => helmOptions(parser),
  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    setup()
    await prepareEnvironment()
    await install()
  },
}
