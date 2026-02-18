import * as process from 'node:process'
import { $ } from 'zx'
import { terminal } from '../common/debug'
import {
  getGitConfigData,
  getGitCredentials,
  GIT_CONFIG_NAMESPACE,
  GIT_CONFIG_SECRET_NAME,
  setGitConfig,
} from '../common/git-config'
import { hfValues } from '../common/hf'
import { createUpdateConfigMap, createUpdateGenericSecret, getK8sConfigMap, getK8sSecret, k8s } from '../common/k8s'
import { AplOperations } from './apl-operations'
import { getErrorMessage } from './utils'
import { operatorEnv } from './validators'

export class Installer {
  private d = terminal('operator:installer')
  private aplOps: AplOperations

  constructor(aplOps: AplOperations) {
    this.aplOps = aplOps
    this.d.info('Initializing Installer')
  }

  public async isInstalled(): Promise<boolean> {
    const installStatus = await this.getInstallationStatus()
    if (installStatus === undefined) {
      // Indicate migrated state by setting negative value
      await this.updateInstallationStatus('completed', -1)
      return true
    }
    if (installStatus === 'completed') {
      // Verify the git repo actually has content - the previous install may have
      // marked status as completed but the pod was killed before the git push finished
      const gitRepoHasContent = await this.verifyGitRepoHasMainBranch()
      if (!gitRepoHasContent) {
        this.d.warn('Installation marked as completed but git repo has no main branch - will re-install')
        return false
      }
      return true
    }
    return false
  }

  private async verifyGitRepoHasMainBranch(): Promise<boolean> {
    try {
      // Get credentials from K8s secret (created by Helm at deploy time)
      const creds = await getK8sSecret('gitea-credentials', 'apl-operator')
      const username = creds?.GIT_USERNAME ?? 'otomi-admin'
      const password = creds?.GIT_PASSWORD ?? ''
      const repoUrl = `${process.env.GIT_PROTOCOL}://${username}:${password}@${process.env.GIT_URL}:${process.env.GIT_PORT}/${operatorEnv.GIT_ORG}/${operatorEnv.GIT_REPO}.git`
      const result = await $`git ls-remote --exit-code --heads ${repoUrl} main`.nothrow().quiet()
      return result.exitCode === 0
    } catch {
      // If we can't check (e.g. gitea not ready yet), assume it's fine
      // The operator will detect the issue later during git polling
      this.d.warn('Could not verify git repo - gitea may not be ready yet')
      return true
    }
  }

  public async initialize() {
    while (true) {
      try {
        await this.aplOps.validateCluster()
        await this.aplOps.bootstrap()
        return
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        this.d.error(`Bootstrap attempt failed:`, errorMessage)

        // Wait 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  public async reconcileInstall(): Promise<void> {
    let attemptNumber = 0

    while (true) {
      try {
        attemptNumber += 1
        this.d.info(`Starting installation attempt ${attemptNumber}`)

        // Run the installation sequence
        await this.updateInstallationStatus('in-progress', attemptNumber)
        await this.aplOps.install()
        await this.ensureSecretsAndConfig()

        await this.updateInstallationStatus('completed', attemptNumber)
        return
      } catch (error) {
        await this.updateInstallationStatus('failed', attemptNumber)
        this.d.warn(`Installation attempt ${attemptNumber} failed, retrying in 1 second...`, getErrorMessage(error))

        // Wait 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  private async getInstallationStatus(): Promise<string | undefined> {
    const configMap = await getK8sConfigMap('apl-operator', 'apl-installation-status', k8s.core())
    const status = configMap?.data?.status
    this.d.info(`Current installation status: ${status}`)
    this.d.debug(`ConfigMap data: ${configMap?.data}`)
    return status
  }

  private async updateInstallationStatus(status: string, attempt: number): Promise<void> {
    try {
      const data = {
        status,
        attempt: attempt.toString(),
        timestamp: new Date().toISOString(),
      }

      await createUpdateConfigMap(k8s.core(), 'apl-installation-status', 'apl-operator', data)
    } catch (err) {
      this.d.warn('Failed to update installation status:', getErrorMessage(err))
    }
  }

  public async setEnvAndCreateSecrets(): Promise<void> {
    this.d.debug('Retrieving or creating git credentials')
    await this.setupSopsEnvironment()
  }

  private async setupSopsEnvironment() {
    const aplSopsSecret = await getK8sSecret('apl-sops-secrets', 'apl-operator')

    if (aplSopsSecret?.SOPS_AGE_KEY) {
      process.env.SOPS_AGE_KEY = aplSopsSecret.SOPS_AGE_KEY
      this.d.debug('Using existing sops credentials from secret')
    } else {
      // SOPS is no longer used (replaced by SealedSecrets + ESO).
      // Skip hfValues() call which requires the git repo that may not exist yet.
      this.d.debug('SOPS Age key not found in secret, skipping (SealedSecrets in use)')
    }
  }

  // public for testing. This method should only be used if you are certain there are values locally.
  async ensureSecretsAndConfig(): Promise<void> {
    this.d.info('Verifying secrets and config after installation')
    const values = (await hfValues()) as Record<string, any>
    if (!values) {
      this.d.warn('Could not retrieve hfValues, skipping secrets/config verification')
      return
    }

    const otomiGit = values?.otomi?.git
    const agePrivateKey = values?.kms?.sops?.age?.privateKey

    // Ensure apl-git-credentials secret
    const credentials = await getGitCredentials()
    if (!credentials) {
      this.d.info('Recreating apl-git-credentials secret')
      await createUpdateGenericSecret(k8s.core(), GIT_CONFIG_SECRET_NAME, GIT_CONFIG_NAMESPACE, {
        username: otomiGit?.username,
        password: otomiGit?.password,
      })
    }

    // Ensure apl-sops-secrets secret
    const sopsSecret = await getK8sSecret('apl-sops-secrets', GIT_CONFIG_NAMESPACE)
    if (!sopsSecret?.SOPS_AGE_KEY && agePrivateKey) {
      this.d.info('Recreating apl-sops-secrets secret')
      await createUpdateGenericSecret(k8s.core(), 'apl-sops-secrets', GIT_CONFIG_NAMESPACE, {
        SOPS_AGE_KEY: agePrivateKey,
      })
    }

    // Ensure apl-git-config configmap
    const configData = await getGitConfigData()
    if (!configData?.repoUrl || !configData?.branch || !configData?.email) {
      this.d.info('Recreating apl-git-config configmap')
      await setGitConfig({
        repoUrl: otomiGit?.repoUrl,
        branch: otomiGit?.branch,
        email: otomiGit?.email,
      })
    }
  }
}
