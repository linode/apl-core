import retry from 'async-retry'
import { mkdirSync, rmSync } from 'fs'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { setGitConfig } from 'src/common/git-config'
import { deployEssential, hf, HF_DEFAULT_SYNC_ARGS, hfValues } from 'src/common/hf'
import { applyServerSide, getDeploymentState, getHelmReleases, setDeploymentState, waitForCRD } from 'src/common/k8s'
import { getFilename, rootDir } from 'src/common/utils'
import { getImageTagFromValues, getPackageVersion, writeValuesToFile } from 'src/common/values'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv, CommandModule } from 'yargs'
import { $, cd } from 'zx'
import { commit, createCredentialsSecret, createWelcomeConfigMap, initialSetupData } from './commit'

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

export const installAll = async () => {
  const d = terminal(`cmd:${cmdName}:installAll`)
  const prevState = await getDeploymentState()
  const hfArgs = HF_DEFAULT_SYNC_ARGS

  d.info('Start install all')
  d.info(`Deployment state: ${JSON.stringify(prevState)}`)
  const tag = await getImageTagFromValues()
  const version = getPackageVersion()
  await setDeploymentState({ status: 'deploying', deployingTag: tag, deployingVersion: version })

  const state = await getDeploymentState()
  const releases = await getHelmReleases()
  await writeValuesToFile(`${env.ENV_DIR}/env/status.yaml`, { status: { otomi: state, helm: releases } }, true)

  const essentialDeployResult = await deployEssential()
  if (!essentialDeployResult) {
    throw new Error('Failed to deploy essential manifests')
  }

  d.info('Deploying CRDs')
  await retryInstallStep(applyServerSide, 'charts/kube-prometheus-stack/charts/crds/crds')
  // Wait for ServiceMonitor CRD to be established before deploying nginx
  await retryInstallStep(waitForCRD, 'servicemonitors.monitoring.coreos.com')
  await retryInstallStep(async () => $`kubectl apply -f charts/tekton-triggers/crds --server-side`)

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

  d.info('Deploying charts containing label app=core')
  await hf(
    {
      // Includes a selector on labels app=core.
      // Using file to circumvent parallel processing, which
      // cannot handle dependencies across multiple files.
      fileOpts: 'helmfile.tpl/helmfile-core.yaml',
      logLevel: logLevelString(),
      args: hfArgs,
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )

  if (!(env.isDev && env.DISABLE_SYNC)) {
    // Get the git configuration from values
    const values = (await hfValues()) as Record<string, any>
    // Commit to Git repository
    await commit(true)

    await setGitConfig({
      repoUrl: values?.otomi?.git?.repoUrl,
      branch: values?.otomi?.git?.branch ?? 'main',
      email: values?.otomi?.git?.email,
    })

    const initialData = await initialSetupData()
    await retryInstallStep(createCredentialsSecret, initialData.secretName, initialData.username, initialData.password)
    await retryInstallStep(createWelcomeConfigMap, initialData.secretName, initialData.domainSuffix)
  }
  await setDeploymentState({ status: 'deployed', version })
  d.info('Installation completed')
}

const install = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:install`)
  const argv: HelmArguments = getParsedArgs()
  if (!argv.label && !argv.file) {
    try {
      cd(rootDir)
      await installAll()
    } catch (e) {
      d.error(e)
      throw e
    }
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
