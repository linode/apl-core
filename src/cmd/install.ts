import retry from 'async-retry'
import { mkdirSync, rmSync } from 'fs'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { APL_OPERATOR_NS, APL_OPERATOR_STATUS_CM } from 'src/common/constants'
import { logLevelString, terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { setGitConfig } from 'src/common/git-config'
import { deployEssential, hf, HF_DEFAULT_SYNC_ON_INITIAL_INSTALL_ARGS, hfValues } from 'src/common/hf'
import {
  applyServerSide,
  createArgoCdRedisSecret,
  createUpdateConfigMap,
  getDeploymentState,
  getHelmReleases,
  getK8sConfigMap,
  getK8sSecret,
  k8s,
  setDeploymentState,
  waitForCRD,
} from 'src/common/k8s'
import {
  AppliedSecret,
  applySealedSecretManifestsFromDir,
  restartSealedSecretsController,
} from 'src/common/sealed-secrets'
import { getFilename, rootDir } from 'src/common/utils'
import { getImageTagFromValues, getPackageVersion, writeValuesToFile } from 'src/common/values'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { getErrorMessage } from 'src/operator/utils'
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

export const retryInstallStep = async <T, Args extends any[]>(
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
 * Takes the list of applied secrets from applySealedSecretManifestsFromDir.
 */
const allSecretsExist = async (secrets: AppliedSecret[], deps = { getK8sSecret }): Promise<boolean> => {
  for (const { namespace, secretName } of secrets) {
    try {
      const secret = await deps.getK8sSecret(secretName, namespace)
      if (!secret) return false
    } catch {
      return false
    }
  }
  return true
}

const waitForSealedSecrets = async (
  appliedSecrets: AppliedSecret[],
  timeoutMs = env.SEALED_SECRETS_TIMEOUT_MS,
  intervalMs = env.SEALED_SECRETS_INTERVAL_MS,
  deps = { getK8sSecret, terminal },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:waitForSealedSecrets`)

  if (appliedSecrets.length === 0) {
    d.info('No sealed secrets to wait for')
    return
  }

  d.info(
    `Waiting for ${appliedSecrets.length} sealed secrets to be decrypted: ${appliedSecrets.map((s) => s.secretName).join(', ')}`,
  )

  await retry(
    async () => {
      const pending: string[] = []
      for (const { namespace, secretName } of appliedSecrets) {
        try {
          const secret = await deps.getK8sSecret(secretName, namespace)
          if (!secret) {
            pending.push(`${namespace}/${secretName}`)
          }
        } catch {
          pending.push(`${namespace}/${secretName}`)
        }
      }

      if (pending.length > 0) {
        throw new Error(`Sealed secrets not yet decrypted: ${pending.join(', ')}`)
      }

      d.info('All sealed secrets have been decrypted')
    },
    {
      retries: Math.ceil(timeoutMs / intervalMs),
      minTimeout: intervalMs,
      maxTimeout: intervalMs,
      factor: 1,
    },
  )
}

const getInitialInstallationMode = async (): Promise<'standard' | 'recovery'> => {
  const installationStatus = await getK8sConfigMap(APL_OPERATOR_NS, APL_OPERATOR_STATUS_CM, k8s.core())
  const mode = installationStatus?.data?.installationMode
  return mode === 'recovery' || mode === 'standard' ? mode : 'standard'
}

export const installAll = async () => {
  const d = terminal(`cmd:${cmdName}:installAll`)
  const prevState = await getDeploymentState()
  const hfArgs = HF_DEFAULT_SYNC_ON_INITIAL_INSTALL_ARGS

  d.info('Start install all')
  d.info(`Deployment state: ${JSON.stringify(prevState)}`)
  const tag = await getImageTagFromValues()
  const version = getPackageVersion()
  const installationMode = await getInitialInstallationMode()
  const deploymentState: Record<string, any> = {
    status: 'deploying',
    deployingTag: tag,
    deployingVersion: version,
  }

  await createUpdateConfigMap(k8s.core(), APL_OPERATOR_STATUS_CM, APL_OPERATOR_NS, { installationMode })
  await setDeploymentState(deploymentState)

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
  const appliedSecrets = await applySealedSecretManifestsFromDir(env.ENV_DIR)

  if (appliedSecrets.length > 0) {
    // Check if all secrets are already decrypted (e.g. on retry after a previous successful run)
    const allExist = await allSecretsExist(appliedSecrets, { getK8sSecret })
    if (allExist) {
      d.info('All sealed secrets already decrypted, skipping controller restart')
    } else {
      // The controller may have started before the sealed-secrets-key TLS secret existed,
      // causing it to generate its own key. Restarting forces it to pick up the pre-created key.
      d.info('Restarting sealed-secrets controller to ensure correct key is used')
      await restartSealedSecretsController()

      d.info('Waiting for sealed secrets to be decrypted into K8s Secrets')
      await waitForSealedSecrets(appliedSecrets)
    }
  } else {
    d.info('No sealed secret manifests found, skipping controller restart')
  }

  // Ensure ArgoCD Redis Secret exists and has Helm ownership metadata before Helm applies ArgoCD.
  // redisPassword is an x-secret field and sealed in apl-secrets/argocd-secrets (decrypted just above),
  // so we read it directly from K8s rather than from values.
  d.info('Creating argocd-redis secret from sealed secret')
  const argocdSealedSecret = await getK8sSecret('argocd-secrets', 'apl-secrets').catch(() => undefined)
  await createArgoCdRedisSecret({ apps: { argocd: { redisPassword: argocdSealedSecret?.redisPassword } } }).catch(
    (error) => {
      d.warn('Could not pre-create argocd-redis secret:', getErrorMessage(error))
    },
  )

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

  // Deploy cert-manager artifacts (ExternalSecrets, ClusterIssuers, Certificates)
  // Must be after app=core (cert-manager CRDs) and after ESO + ClusterSecretStore
  d.info('Deploying cert-manager artifacts')
  await hf(
    {
      fileOpts: 'helmfile.d/helmfile-07.init.yaml.gotmpl',
      labelOpts: ['name=cert-manager-artifacts'],
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

    const gitBranch = values?.otomi?.git?.branch ?? 'main'
    await setGitConfig({
      repoUrl: values?.otomi?.git?.repoUrl,
      branch: gitBranch,
      email: values?.otomi?.git?.email,
    })

    // Verify the git push actually succeeded by checking the remote branch exists
    d.info('Verifying git push succeeded')
    const verifyResult = await $`git -C ${env.ENV_DIR} ls-remote --exit-code --heads origin ${gitBranch}`
      .nothrow()
      .quiet()
    if (verifyResult.exitCode !== 0) {
      throw new Error(`Git push verification failed: remote branch ${gitBranch} does not exist after commit`)
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
