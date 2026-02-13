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
  applySealedSecretManifestsFromDir,
  buildSecretToNamespaceMap,
  restartSealedSecretsController,
} from 'src/common/sealed-secrets'
import { getFilename, getSchemaSecretsPaths, rootDir } from 'src/common/utils'
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
 * Derives the list of secrets to wait for from schema x-secret fields via buildSecretToNamespaceMap().
 */
const waitForSealedSecrets = async (
  timeoutMs = 120000,
  intervalMs = 3000,
  deps = { getK8sSecret, terminal, buildSecretToNamespaceMap, getSchemaSecretsPaths },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:waitForSealedSecrets`)

  // Build list of secrets to wait for from schema-driven mappings
  // We pass empty secrets/teams since we just need the secret names and namespaces
  const mappings = await deps.buildSecretToNamespaceMap({}, [], undefined, {
    getSchemaSecretsPaths: deps.getSchemaSecretsPaths,
  })

  // Deduplicate by namespace/secretName
  const secretsToWait = new Map<string, { namespace: string; secretName: string }>()
  for (const mapping of mappings) {
    const key = `${mapping.namespace}/${mapping.secretName}`
    if (!secretsToWait.has(key)) {
      secretsToWait.set(key, { namespace: mapping.namespace, secretName: mapping.secretName })
    }
  }

  if (secretsToWait.size === 0) {
    d.info('No sealed secrets to wait for')
    return
  }

  d.info(`Waiting for ${secretsToWait.size} sealed secrets to be decrypted`)
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const pending: string[] = []
    for (const { namespace, secretName } of secretsToWait.values()) {
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

  // Deploy sealed-secrets controller right after essentials
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

  d.info('Waiting for SealedSecret CRD to be ready')
  await retryInstallStep(waitForCRD, 'sealedsecrets.bitnami.com')

  d.info('Applying SealedSecret manifests')
  await applySealedSecretManifestsFromDir(env.ENV_DIR)

  d.info('Restarting sealed-secrets controller')
  await restartSealedSecretsController()

  d.info('Waiting for sealed secrets to be decrypted into K8s Secrets')
  await waitForSealedSecrets()

  // Deploy ESO (External Secrets Operator)
  d.info('Deploying external-secrets operator')
  await hf(
    {
      fileOpts: 'helmfile.d/helmfile-01.init.yaml.gotmpl',
      labelOpts: ['name=external-secrets'],
      logLevel: logLevelString(),
      args: hfArgs,
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )

  d.info('Waiting for ExternalSecret CRD to be ready')
  await retryInstallStep(waitForCRD, 'externalsecrets.external-secrets.io')

  d.info('Deploying ESO ClusterSecretStore')
  await hf(
    {
      fileOpts: 'helmfile.d/helmfile-01.init.yaml.gotmpl',
      labelOpts: ['name=external-secrets-artifacts'],
      logLevel: logLevelString(),
      args: hfArgs,
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )

  // Deploy cert-manager ExternalSecrets (custom-ca, external-dns) now that ESO + ClusterSecretStore are ready
  d.info('Deploying cert-manager artifacts (ExternalSecrets)')
  await hf(
    {
      fileOpts: 'helmfile.d/helmfile-07.init.yaml.gotmpl',
      labelOpts: ['name=cert-manager-artifacts'],
      logLevel: logLevelString(),
      args: hfArgs,
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )

  // Deploy CRDs
  d.info('Deploying CRDs')
  await retryInstallStep(applyServerSide, 'charts/kube-prometheus-stack/charts/crds/crds')
  await retryInstallStep(waitForCRD, 'servicemonitors.monitoring.coreos.com')
  await retryInstallStep(async () => $`kubectl apply -f charts/tekton-triggers/crds --server-side`)

  d.info('Deploying charts containing label stage=prep')
  await hf(
    {
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
    await commit(true)

    // Verify the git push actually succeeded by checking the remote branch exists
    d.info('Verifying git push succeeded')
    const verifyResult = await $`git -C ${env.ENV_DIR} ls-remote --exit-code --heads origin main`.nothrow().quiet()
    if (verifyResult.exitCode !== 0) {
      throw new Error('Git push verification failed: remote branch main does not exist after commit')
    }
    d.info('Git push verified successfully')

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
