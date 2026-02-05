import * as process from 'node:process'
import { terminal } from '../common/debug'
import { createUpdateConfigMap, getK8sConfigMap, getK8sSecret, k8s } from '../common/k8s'
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
}
