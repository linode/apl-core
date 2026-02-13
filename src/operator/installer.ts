import * as process from 'node:process'
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
    return installStatus === 'completed'
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

    if (!aplSopsSecret?.SOPS_AGE_KEY) {
      throw new Error('SOPS_AGE_KEY not found in secret')
    }
    process.env.SOPS_AGE_KEY = aplSopsSecret.SOPS_AGE_KEY
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
