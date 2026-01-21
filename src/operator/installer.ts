import * as process from 'node:process'
import { terminal } from '../common/debug'
import { getGitCredentials, GIT_CONFIG_SECRET_NAME, GIT_CONFIG_NAMESPACE } from '../common/git-config'
import { hfValues } from '../common/hf'
import { createUpdateConfigMap, createUpdateGenericSecret, getK8sConfigMap, getK8sSecret, k8s } from '../common/k8s'
import { AplOperations } from './apl-operations'
import { getErrorMessage } from './utils'

export interface GitCredentials {
  username: string
  password: string
}

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

        await this.updateInstallationStatus('completed', attemptNumber)
        return
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        this.d.error(`Installation attempt ${attemptNumber} failed:`, errorMessage)
        await this.updateInstallationStatus('failed', attemptNumber, errorMessage)
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

  private async updateInstallationStatus(status: string, attempt: number, error?: string): Promise<void> {
    try {
      const data = {
        status,
        attempt: attempt.toString(),
        timestamp: new Date().toISOString(),
        ...(error && { error }),
      }

      await createUpdateConfigMap(k8s.core(), 'apl-installation-status', 'apl-operator', data)
    } catch (err) {
      this.d.warn('Failed to update installation status:', getErrorMessage(err))
    }
  }

  public async setEnvAndCreateSecrets(): Promise<GitCredentials> {
    this.d.debug('Retrieving or creating git credentials')
    await this.setupSopsEnvironment()
    return await this.setupGitCredentials()
  }

  private async setupGitCredentials(): Promise<GitCredentials> {
    try {
      // First, try to get credentials from the apl-git-credentials secret
      const credentials = await getGitCredentials()

      if (credentials?.username && credentials?.password) {
        this.d.debug('Using existing Git credentials from apl-git-credentials secret')
        return credentials
      }

      // Fallback: try to get from values (otomi.git)
      this.d.debug('Extracting Git credentials from installation values')
      const values = (await hfValues()) as Record<string, any>

      const gitUsername: string = values.otomi?.git?.user
      const gitPassword: string = values.otomi?.git?.password

      if (!gitUsername || !gitPassword) {
        throw new Error('Git credentials not found in values (otomi.git.user/password) or apl-git-credentials secret')
      }

      // Store credentials in the standard secret for future use
      await createUpdateGenericSecret(k8s.core(), GIT_CONFIG_SECRET_NAME, GIT_CONFIG_NAMESPACE, {
        username: gitUsername,
        password: gitPassword,
      })

      this.d.debug('Created Git credentials secret')
      return { username: gitUsername, password: gitPassword }
    } catch (error) {
      this.d.error('Failed to setup git credentials:', getErrorMessage(error))
      throw error
    }
  }

  private async setupSopsEnvironment() {
    try {
      const aplSopsSecret = await getK8sSecret('apl-sops-secrets', 'apl-operator')

      if (aplSopsSecret?.SOPS_AGE_KEY) {
        process.env.SOPS_AGE_KEY = aplSopsSecret.SOPS_AGE_KEY
        this.d.debug('Using existing sops credentials from secret')
      } else {
        const values = (await hfValues()) as Record<string, any>
        const sopsAgePrivateKey = values.kms?.sops?.age?.privateKey
        if (sopsAgePrivateKey && !sopsAgePrivateKey.startsWith('ENC')) {
          process.env.SOPS_AGE_KEY = sopsAgePrivateKey
          this.d.debug('Set SOPS_AGE_KEY in environment variables')
          await createUpdateGenericSecret(k8s.core(), 'apl-sops-secrets', 'apl-operator', {
            SOPS_AGE_KEY: sopsAgePrivateKey,
          })
        } else {
          this.d.debug('SOPS Age private key not found or encrypted, skipping')
        }
      }
    } catch (error) {
      this.d.error('Failed to retrieve or create sops credentials:', getErrorMessage(error))
      throw error
    }
  }
}
