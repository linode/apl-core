import { decrypt } from 'src/common/crypt'
import { commit } from '../cmd/commit'
import { terminal } from '../common/debug'
import { env } from '../common/envalid'
import { getStoredGitRepoConfig } from '../common/git-config'
import { waitTillGitRepoAvailable } from '../common/gitea'
import { hfValues } from '../common/hf'
import { checkArgoCDAppStatus, k8s } from '../common/k8s'
import { restartPlatformAuthPods } from '../common/runtime-upgrades/restart-platform-auth-pods'
import { ensureManifestDirectories, ensureTeamGitOpsDirectories } from '../common/utils'
import { getDefaultValues, writeValues } from '../common/values'
import { AplOperations } from './apl-operations'
import { GitRepository } from './git-repository'
import { hasPlatformAuthPodsRestarted, markOperatorReady, markPlatformAuthPodsRestarted, updateApplyState } from './k8s'
import { getErrorMessage } from './utils'

export interface AplOperatorConfig {
  gitRepo: GitRepository
  aplOps: AplOperations
  pollIntervalMs: number
  reconcileIntervalMs: number
}

export enum ApplyTrigger {
  Poll = 'poll',
  Reconcile = 'reconcile',
}

function maskRepoUrl(url: string): string {
  return url.replace(/(https?:\/\/)([^@]+)(@.+)/g, '$1***$3')
}

export const OAUTH2_PROXY_ARGOCD_APP_NAME = 'istio-system-oauth2-proxy'

export class AplOperator {
  private d = terminal('operator:apl-operator')
  private isRunning = false
  private isApplying = false
  private gitRepo: GitRepository
  private aplOps: AplOperations

  readonly authenticatedUrl: string
  readonly pollInterval: number
  readonly reconcileInterval: number

  constructor(config: AplOperatorConfig) {
    const { gitRepo, aplOps, pollIntervalMs, reconcileIntervalMs } = config

    this.pollInterval = pollIntervalMs
    this.reconcileInterval = reconcileIntervalMs
    this.gitRepo = gitRepo
    this.aplOps = aplOps
    this.authenticatedUrl = gitRepo.authenticatedUrl

    this.d.info(`Initializing APL Operator with repo URL: ${maskRepoUrl(gitRepo.authenticatedUrl)}`)
    this.d.debug(`Initializing APL Operator with repo URL: ${gitRepo.authenticatedUrl}`)
  }

  // public for testing
  public async runApplyIfNotBusy(trigger: ApplyTrigger, applyTeamsOnly = false): Promise<void> {
    if (this.isApplying) {
      this.d.info(`[${trigger}] Apply already in progress, skipping`)
      return
    }

    this.isApplying = true
    this.d.info(`[${trigger}] Starting apply process`)

    const commitHash = this.gitRepo.lastRevision
    await updateApplyState({
      commitHash,
      status: 'in-progress',
      timestamp: new Date().toISOString(),
      trigger,
    })

    try {
      const defaultValues = await getDefaultValues()
      this.d.info('Write default values to env repo')
      await writeValues(defaultValues)

      await this.aplOps.migrate()
      if (trigger === ApplyTrigger.Poll) {
        this.d.info(`[${trigger}] Starting validation process`)
        await this.aplOps.validateValues()
        this.d.info(`[${trigger}] Validation process completed`)
      }
      if (trigger === ApplyTrigger.Reconcile) {
        await decrypt()
      }
      const values = await hfValues({}, env.ENV_DIR)
      await ensureTeamGitOpsDirectories(env.ENV_DIR, values ?? {})
      await ensureManifestDirectories()

      await commit(this.gitRepo.config)

      if (applyTeamsOnly) {
        await this.aplOps.applyTeams()
        await this.aplOps.applyAsAppsTeams()
      } else {
        await this.aplOps.apply()
      }

      this.d.info(`[${trigger}] Apply process completed`)

      // The apply run above is what creates the ArgoCD Applications, so from here on the
      // platform can heal itself through ArgoCD. That — not the end of the helmfile install
      // — is what the operator being 'ready' means.
      markOperatorReady()

      await updateApplyState({
        commitHash,
        status: 'succeeded',
        timestamp: new Date().toISOString(),
        trigger,
      })
      try {
        // See adr/2026-08-04-restart-platform-auth-pods-after-oauth2-proxy-healthy.md
        if (await this.needsPlatformAuthPodsRestart()) {
          await this.restartPlatformAuthPods()
        }
      } catch (error) {
        this.d.debug(`Skipping platform-auth pod restart: ${getErrorMessage(error)}`)
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      this.d.error(`[${trigger}] Apply process failed`, errorMessage)
      await updateApplyState({
        commitHash,
        status: 'failed',
        timestamp: new Date().toISOString(),
        trigger,
        errorMessage,
      })
    } finally {
      this.isApplying = false
    }
  }

  private async needsPlatformAuthPodsRestart(): Promise<boolean> {
    if (await hasPlatformAuthPodsRestarted()) return false
    await checkArgoCDAppStatus(OAUTH2_PROXY_ARGOCD_APP_NAME, k8s.custom(), 'health', 'Healthy')
    return true
  }

  private async restartPlatformAuthPods(): Promise<void> {
    this.d.info('oauth2-proxy is healthy, restarting platform-auth pods')
    await restartPlatformAuthPods(k8s.core())
    await markPlatformAuthPodsRestarted()
  }

  // Only used in tests: run N iterations and exit
  public async reconcile(maxIterations = Infinity): Promise<void> {
    this.d.info('Starting reconciliation loop')

    for (let i = 0; this.isRunning && i < maxIterations; i++) {
      try {
        this.d.info('Reconciliation triggered')
        await this.runApplyIfNotBusy(ApplyTrigger.Reconcile)
        this.d.info('Reconciliation completed')
      } catch (error) {
        this.d.error('Error during reconciliation:', getErrorMessage(error))
      }

      await this.scheduleNextAttempt(this.reconcileInterval)
    }

    this.d.info('Reconciliation loop stopped')
  }

  // Only used in tests: run N iterations and exit
  public async pollAndApplyGitChanges(maxIterations = Infinity): Promise<void> {
    this.d.info('Starting git polling loop')

    for (let i = 0; this.isRunning && i < maxIterations; i++) {
      await this.reloadGitCredentials()
      if (this.isApplying) {
        this.d.debug('Skipping polling cycle, apply process is in progress')
        await this.scheduleNextAttempt(this.pollInterval)
        continue
      }

      try {
        const { hasChangesToApply, applyTeamsOnly } = await this.gitRepo.syncAndAnalyzeChanges()

        if (hasChangesToApply) {
          await this.runApplyIfNotBusy(ApplyTrigger.Poll, applyTeamsOnly)
        }
      } catch (error) {
        this.d.error('Error during git polling cycle:', getErrorMessage(error))
      }

      await this.scheduleNextAttempt(this.pollInterval)
    }

    this.d.info('Git polling loop stopped')
  }

  private async reloadGitCredentials(): Promise<void> {
    try {
      const freshConfig = await getStoredGitRepoConfig()
      this.d.debug('Git credentials reloaded successfully')
      await this.gitRepo.reloadConfig(freshConfig)
    } catch (reloadError) {
      this.d.warn('Failed to reload git credentials:', getErrorMessage(reloadError))
    }
  }

  private async scheduleNextAttempt(interval: number) {
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.d.warn('Operator is already running')
      return
    }

    this.isRunning = true
    this.d.info('Starting APL operator')

    try {
      // Reload credentials on every retry to consider potential credential update.
      await waitTillGitRepoAvailable(async () => {
        await this.reloadGitCredentials()
        return this.gitRepo.authenticatedUrl
      })
      await this.gitRepo.clone()
      this.d.info('APL operator started successfully')
    } catch (error) {
      this.isRunning = false
      this.d.error('Failed to start APL operator:', getErrorMessage(error))
      throw error
    }

    try {
      await Promise.all([this.pollAndApplyGitChanges(), this.reconcile()])
    } catch (error) {
      this.d.error('Error in polling or reconcile task:', getErrorMessage(error))
    }
  }

  public stop(): void {
    if (!this.isRunning) {
      this.d.warn('Operator is not running')
      return
    }

    this.d.info('Stopping APL operator')
    this.isRunning = false
  }
}
