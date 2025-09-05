import retry from 'async-retry'
import { terminal } from '../common/debug'
import { createGenericSecret, createK8sConfigMap, getK8sConfigMap, k8s, updateK8sConfigMap } from '../common/k8s'
import { hfValues } from '../common/hf'
import { AplOperations } from './apl-operations'
import { getErrorMessage } from './utils'
import { operatorEnv } from './validators'

export class AplInstaller {
  private d = terminal('operator:apl-installer')
  private aplOps: AplOperations

  constructor(aplOps: AplOperations) {
    this.aplOps = aplOps
    this.d.info('Initializing APL Installer')
  }

  public async runInstallationWithRetry(): Promise<void> {
    return retry(
      async (bail, attemptNumber) => {
        this.d.info(`Starting installation attempt ${attemptNumber}/${operatorEnv.INSTALL_RETRIES}`)

        // Check if installation already completed
        const installStatus = await this.getInstallationStatus()
        if (installStatus === 'completed') {
          this.d.info('Installation already completed, skipping')
          return
        }

        await this.updateInstallationStatus('in-progress', attemptNumber)

        try {
          // Run the installation sequence
          await this.aplOps.validateCluster()
          await this.aplOps.bootstrap()
          await this.aplOps.install()

          await this.updateInstallationStatus('completed', attemptNumber)
          this.d.info('Installation completed successfully')
        } catch (error) {
          const errorMessage = getErrorMessage(error)
          this.d.error(`Installation attempt ${attemptNumber} failed:`, errorMessage)
          await this.updateInstallationStatus('failed', attemptNumber, errorMessage)
          throw error
        }
      },
      {
        retries: operatorEnv.INSTALL_RETRIES,
        maxTimeout: operatorEnv.INSTALL_MAX_TIMEOUT_MS,
        onRetry: (error, attempt) => {
          this.d.warn(`Installation attempt ${attempt} failed, retrying...`, getErrorMessage(error))
        },
      },
    )
  }

  private async getInstallationStatus(): Promise<string> {
    try {
      const configMap = await getK8sConfigMap('apl-operator', 'apl-installation-status')
      return configMap?.data?.status || 'pending'
    } catch (error) {
      return 'pending'
    }
  }

  private async updateInstallationStatus(status: string, attempt: number, error?: string): Promise<void> {
    try {
      const data = {
        status,
        attempt: attempt.toString(),
        timestamp: new Date().toISOString(),
        ...(error && { error }),
      }

      try {
        await updateK8sConfigMap('apl-operator', 'apl-installation-status', data)
      } catch (updateError) {
        await createK8sConfigMap('apl-operator', 'apl-installation-status', data)
      }
    } catch (err) {
      this.d.warn('Failed to update installation status:', getErrorMessage(err))
    }
  }

  public async createGitCredentialsSecret(): Promise<void> {
    this.d.info('Creating git credentials secret from installation values')

    try {
      // Extract git credentials from Helmfile values after installation
      const values = (await hfValues()) as Record<string, any>

      // Extract git credentials from values
      const gitUsername = values.gitea?.adminUsername
      const gitPassword = values.gitea?.adminPassword

      if (!gitUsername || !gitPassword) {
        this.d.warn('Git credentials not found in values, operator will run without GitOps functionality')
        return
      }

      try {
        await createGenericSecret(k8s.core(), 'gitea-credentials', 'apl-operator', {
          username: gitUsername,
          password: gitPassword,
        })
        this.d.info('Created git credentials secret with real values')

        process.env.GIT_USERNAME = gitUsername
        process.env.GIT_PASSWORD = gitPassword
        this.d.info('Set git credentials in environment variables')
      } catch (error) {
        this.d.debug('Git credentials secret may already exist:', getErrorMessage(error))
      }
    } catch (error) {
      this.d.error('Failed to create git credentials secret:', getErrorMessage(error))
      throw error
    }
  }
}
