import { terminal } from '../common/debug'
import { createUpdateConfigMap, createUpdateGenericSecret, getK8sConfigMap, getK8sSecret, k8s } from '../common/k8s'
import { hfValues } from '../common/hf'
import { AplOperations } from './apl-operations'
import { getErrorMessage } from './utils'
import * as process from 'node:process'

export interface GitCredentials {
  username: string
  password: string
}

export class Installer {
  private d = terminal('operator:apl-installer')
  private aplOps: AplOperations

  constructor(aplOps: AplOperations) {
    this.aplOps = aplOps
    this.d.info('Initializing APL Installer')
  }

  public async reconcileInstall(): Promise<void> {
    let attemptNumber = 0

    while (true) {
      attemptNumber += 1
      this.d.info(`Starting installation attempt ${attemptNumber}`)

      try {
        // Always run bootstrap to ensure the environment is ready (even on restarts)
        await this.aplOps.validateCluster()
        await this.aplOps.bootstrap()

        // Check if installation already completed
        const installStatus = await this.getInstallationStatus()
        if (installStatus === 'completed') {
          this.d.info('Installation already completed, skipping install steps')
          return
        }

        // Run the installation sequence
        await this.updateInstallationStatus('in-progress', attemptNumber)
        await this.aplOps.install()

        await this.updateInstallationStatus('completed', attemptNumber)
        this.d.info('Installation completed successfully')
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

  private async getInstallationStatus(): Promise<string> {
    const configMap = await getK8sConfigMap('apl-operator', 'apl-installation-status', k8s.core())
    const status = configMap?.data?.status || 'pending'
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
    process.env.CI = 'true'
    await this.setupSopsEnvironment()
    return await this.setupGiteaCredentials()
  }

  private async setupGiteaCredentials() {
    try {
      const giteaCredentialsSecret = await getK8sSecret('gitea-credentials', 'apl-operator')

      if (giteaCredentialsSecret?.GIT_USERNAME && giteaCredentialsSecret?.GIT_PASSWORD) {
        const gitUsername = giteaCredentialsSecret.GIT_USERNAME
        const gitPassword = giteaCredentialsSecret.GIT_PASSWORD

        this.d.debug('Using existing git credentials from secret')
        return { username: gitUsername, password: gitPassword }
      }

      this.d.debug('Extracting credentials from installation values')
      const values = (await hfValues()) as Record<string, any>

      const gitUsername: string = values.apps.gitea?.adminUsername || 'otomi-admin'
      const gitPassword: string = values.apps.gitea?.adminPassword

      if (!gitUsername || !gitPassword) {
        throw new Error('Git credentials not found in values')
      }

      await createUpdateGenericSecret(k8s.core(), 'gitea-credentials', 'apl-operator', {
        GIT_USERNAME: gitUsername,
        GIT_PASSWORD: gitPassword,
      })

      this.d.debug('Created git credentials secret')
      return { username: gitUsername, password: gitPassword }
    } catch (error) {
      this.d.error('Failed to retrieve or create gitea credentials:', getErrorMessage(error))
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
