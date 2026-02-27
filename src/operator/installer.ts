import * as process from 'node:process'
import { runTraceCollectionLoop } from 'src/cmd/traces'
import { recoverFromGit } from 'src/common/bootstrap'
import { APL_OPERATOR_NS, APL_OPERATOR_STATUS_CM } from 'src/common/constants'
import { $ } from 'zx'
import { terminal } from '../common/debug'
import { getStoredGitRepoConfig, GIT_CONFIG_NAMESPACE } from '../common/git-config'
import { createUpdateConfigMap, deletePendingHelmReleases, getK8sConfigMap, getK8sSecret, k8s } from '../common/k8s'
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
      const gitConfig = await getStoredGitRepoConfig()
      if (!gitConfig) return true // Can't verify without config, assume fine
      const result = await $`git ls-remote --exit-code --heads ${gitConfig.authenticatedUrl} main`.nothrow().quiet()
      return result.exitCode === 0
    } catch {
      // If we can't check (e.g. gitea not ready yet), assume it's fine
      // The operator will detect the issue later during git polling
      this.d.warn('Could not verify git repo - may not be ready yet')
      return true
    }
  }

  public async recoverFromGit(): Promise<void> {
    while (true) {
      try {
        const gitConfig = await getStoredGitRepoConfig()
        await recoverFromGit(gitConfig)
        return
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        this.d.error('Recover from git attempt failed:', errorMessage)
        // Wait 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  public async initialize(): Promise<void> {
    while (true) {
      try {
        await this.aplOps.validateCluster()
        await this.aplOps.bootstrap()
        return
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        this.d.error('Bootstrap attempt failed:', errorMessage)
        // Wait 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  public async ensureRecoveryPrerequisites(): Promise<void> {
    await getStoredGitRepoConfig()
    const sopsSecret = await getK8sSecret('apl-sops-secrets', GIT_CONFIG_NAMESPACE)
    if (!sopsSecret || Object.keys(sopsSecret).length === 0) {
      throw new Error('KMS/SOPS config not found in apl-sops-secrets secret')
    }
  }

  public async getInstallationMode(): Promise<'standard' | 'recovery'> {
    const installationStatus = await getK8sConfigMap(APL_OPERATOR_NS, APL_OPERATOR_STATUS_CM, k8s.core())
    const installationMode = installationStatus?.data?.installationMode
    return installationMode === 'recovery' ? 'recovery' : 'standard'
  }

  public async resetRecoveryModeToStandard(): Promise<void> {
    await createUpdateConfigMap(k8s.core(), APL_OPERATOR_STATUS_CM, APL_OPERATOR_NS, {
      installationMode: 'standard',
    })
  }

  public async reconcileInstall(): Promise<void> {
    let attemptNumber = 0
    runTraceCollectionLoop().catch((error) => {
      this.d.warn('Trace collection loop failed:', getErrorMessage(error))
    })
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

        // Clean up stuck Helm releases (e.g. pending-install, pending-upgrade)
        // so the next retry can proceed without "another operation is in progress" errors
        try {
          await deletePendingHelmReleases()
        } catch (cleanupError) {
          this.d.warn('Failed to clean up pending Helm releases:', getErrorMessage(cleanupError))
        }

        this.d.warn(`Installation attempt ${attemptNumber} failed, retrying in 1 second...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  private async getInstallationStatus(): Promise<string | undefined> {
    const configMap = await getK8sConfigMap(APL_OPERATOR_NS, APL_OPERATOR_STATUS_CM, k8s.core())
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
        // Always include error field to prevent stale values from StrategicMergePatch
        error: error ?? '',
      }

      await createUpdateConfigMap(k8s.core(), APL_OPERATOR_STATUS_CM, APL_OPERATOR_NS, data)
    } catch (err) {
      this.d.warn('Failed to update installation status:', getErrorMessage(err))
    }
  }

  public async setEnvAndCreateSecrets(): Promise<void> {
    this.d.debug('Setting up environment')
    await this.setupSopsEnvironment()
  }

  private async setupSopsEnvironment(): Promise<void> {
    try {
      const aplSopsSecret = await getK8sSecret('apl-sops-secrets', APL_OPERATOR_NS)
      if (!aplSopsSecret?.SOPS_AGE_KEY) {
        this.d.info('SOPS_AGE_KEY not found — cluster may already use SealedSecrets')
        return
      }
      process.env.SOPS_AGE_KEY = aplSopsSecret.SOPS_AGE_KEY
      this.d.info('SOPS environment configured')
    } catch (error) {
      this.d.info('Could not read apl-sops-secrets — cluster may already use SealedSecrets')
    }
  }
}
