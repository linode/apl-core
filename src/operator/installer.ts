import { terminal } from '../common/debug'
import { createUpdateConfigMap, createUpdateGenericSecret, getK8sConfigMap, k8s } from '../common/k8s'
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
    this.d.info('Extracting credentials from installation values')

    try {
      // Extract credentials from Helmfile values after installation
      const values = (await hfValues()) as Record<string, any>

      // Extract git credentials from values
      const gitUsername: string = values.apps.gitea?.adminUsername || 'otomi-admin'
      const gitPassword: string = values.apps.gitea?.adminPassword

      if (!gitUsername || !gitPassword) {
        // TODO do we want to throw here or generate random credentials?
        throw new Error('Git credentials not found in values')
      } else {
        await createUpdateGenericSecret(k8s.core(), 'gitea-credentials', 'apl-operator', {
          GIT_USERNAME: gitUsername,
          GIT_PASSWORD: gitPassword,
        })

        process.env.GIT_USERNAME = gitUsername
        process.env.GIT_PASSWORD = gitPassword
        this.d.info('Set git credentials in environment variables')
      }

      // Extract SOPS Age key from values
      const sopsAgePrivateKey = values.kms?.sops?.age?.privateKey
      if (sopsAgePrivateKey && !sopsAgePrivateKey.startsWith('ENC')) {
        process.env.SOPS_AGE_KEY = sopsAgePrivateKey
        this.d.info('Set SOPS_AGE_KEY in environment variables')
      } else {
        this.d.debug('SOPS Age private key not found or encrypted, skipping')
      }
      process.env.CI = 'true'
      return { username: gitUsername, password: gitPassword }
    } catch (error) {
      this.d.error('Failed to extract credentials:', getErrorMessage(error))
      throw error
    }
  }
}
