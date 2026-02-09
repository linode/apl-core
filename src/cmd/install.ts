import retry from 'async-retry'
import { mkdirSync, rmSync } from 'fs'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { deployEssential, hf, HF_DEFAULT_SYNC_ARGS } from 'src/common/hf'
import {
  applyServerSide,
  getDeploymentState,
  getHelmReleases,
  getK8sSecret,
  setDeploymentState,
  waitForCRD,
} from 'src/common/k8s'
import {
  APP_SECRET_OVERRIDES,
  applySealedSecretManifestsFromDir,
  restartSealedSecretsController,
} from 'src/common/sealed-secrets'
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

/**
 * Wait for SealedSecrets controller to decrypt SealedSecret resources into K8s Secrets.
 * Polls all secrets defined in APP_SECRET_OVERRIDES until they exist in the cluster.
 */
const waitForSealedSecrets = async (
  timeoutMs = 120000,
  intervalMs = 3000,
  deps = { getK8sSecret, terminal },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:waitForSealedSecrets`)

  // Build list of secrets to wait for from APP_SECRET_OVERRIDES
  const secretsToWait: Array<{ namespace: string; secretName: string }> = []
  for (const overrides of Object.values(APP_SECRET_OVERRIDES)) {
    for (const override of overrides) {
      secretsToWait.push({ namespace: override.namespace, secretName: override.secretName })
    }
  }

  if (secretsToWait.length === 0) {
    d.info('No sealed secrets to wait for')
    return
  }

  d.info(`Waiting for ${secretsToWait.length} sealed secrets to be decrypted`)
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const pending: string[] = []
    for (const { namespace, secretName } of secretsToWait) {
      try {
        const secret = await deps.getK8sSecret(secretName, namespace)
        if (!secret) {
          pending.push(`${namespace}/${secretName}`)
        }
      } catch {
        pending.push(`${namespace}/${secretName}`)
      }
    }

    if (pending.length === 0) {
      d.info('All sealed secrets have been decrypted')
      return
    }

    d.info(`Still waiting for sealed secrets: ${pending.join(', ')}`)
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Timed out waiting for sealed secrets to be decrypted after ${timeoutMs}ms`)
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

  // Deploy sealed-secrets controller first (needs to be ready before applying SealedSecrets)
  d.info('Deploying sealed-secrets controller')
  await hf(
    {
      fileOpts: 'helmfile.d/helmfile-01.init.yaml.gotmpl',
      labelOpts: ['name=sealed-secrets'],
      logLevel: logLevelString(),
      args: hfArgs,
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )

  // Wait for SealedSecret CRD to be established
  d.info('Waiting for SealedSecret CRD to be ready')
  await retryInstallStep(waitForCRD, 'sealedsecrets.bitnami.com')

  // Apply SealedSecret manifests from disk (generated during bootstrap)
  d.info('Applying SealedSecret manifests')
  await applySealedSecretManifestsFromDir(env.ENV_DIR)

  // Restart the sealed-secrets controller to ensure it uses the correct key
  // This is needed because the controller may have generated its own key before
  // the bootstrap-created sealed-secrets-key secret was available
  d.info('Restarting sealed-secrets controller')
  await restartSealedSecretsController()

  // Wait for SealedSecrets controller to decrypt all SealedSecret resources into K8s Secrets.
  // This is critical: subsequent steps (hfValues, commit, getRepo) resolve sealed: placeholders
  // by reading these K8s Secrets. Without this wait, placeholder resolution fails silently.
  d.info('Waiting for sealed secrets to be decrypted into K8s Secrets')
  await waitForSealedSecrets()

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
    await commit(true)
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
