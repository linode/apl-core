import { terminal } from '../common/debug'
import { waitTillGitRepoAvailable } from '../common/k8s'
import { GitRepository } from './git-repository'
import { AplOperations } from './apl-operations'
import { updateApplyState } from './k8s'

export interface AplOperatorConfig {
  gitRepo: GitRepository
  aplOps: AplOperations
  pollIntervalMs: number
  reconcileIntervalMs: number
}

function maskRepoUrl(url: string): string {
  return url.replace(/(https?:\/\/)([^@]+)(@.+)/g, '$1***$3')
}

export class AplOperator {
  private d = terminal('operator:apl')
  private isRunning = false
  private isApplying = false
  private gitRepo: GitRepository
  private aplOps: AplOperations

  readonly repoUrl: string
  readonly pollInterval: number
  readonly reconcileInterval: number

  constructor(config: AplOperatorConfig) {
    const { gitRepo, aplOps, pollIntervalMs, reconcileIntervalMs } = config

    this.pollInterval = pollIntervalMs
    this.reconcileInterval = reconcileIntervalMs
    this.gitRepo = gitRepo
    this.aplOps = aplOps
    this.repoUrl = gitRepo.repoUrl

    this.d.info(`Initializing APL Operator with repo URL: ${maskRepoUrl(gitRepo.repoUrl)}`)
  }

  // public for testing
  public async runApplyIfNotBusy(trigger: string, applyTeamsOnly = false): Promise<void> {
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
      if (applyTeamsOnly) {
        await this.aplOps.applyAsAppsTeams()
      } else {
        await this.aplOps.apply()
      }
      this.d.info(`[${trigger}] Apply process completed`)

      this.d.info(`[${trigger}] Starting validation process`)
      await this.aplOps.validateValues()
      this.d.info(`[${trigger}] Validation process completed`)

      await updateApplyState({
        commitHash,
        status: 'succeeded',
        timestamp: new Date().toISOString(),
        trigger,
      })
    } catch (error) {
      this.d.error(`[${trigger}] Apply process failed`, error)
      await updateApplyState({
        commitHash,
        status: 'failed',
        timestamp: new Date().toISOString(),
        trigger,
        errorMessage: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.isApplying = false
    }
  }

  // Only used in tests: run N iterations and exit
  public async reconcile(maxIterations = Infinity): Promise<void> {
    this.d.info('Starting reconciliation loop')

    for (let i = 0; this.isRunning && i < maxIterations; i++) {
      try {
        this.d.info('Reconciliation triggered')
        await this.runApplyIfNotBusy('reconcile')
        this.d.info('Reconciliation completed')
      } catch (error) {
        this.d.error('Error during reconciliation:', error)
      }

      await new Promise((resolve) => setTimeout(resolve, this.reconcileInterval))
    }

    this.d.info('Reconciliation loop stopped')
  }

  // Only used in tests: run N iterations and exit
  public async pollForChanges(maxIterations = Infinity): Promise<void> {
    this.d.info('Starting polling loop')

    for (let i = 0; this.isRunning && i < maxIterations; i++) {
      if (this.isApplying) {
        this.d.debug('Skipping polling, apply process is in progress')
        await new Promise((resolve) => setTimeout(resolve, this.pollInterval))
        continue
      }
      try {
        const { hasChangesToApply, applyTeamsOnly } = await this.gitRepo.pull()

        if (hasChangesToApply) {
          this.d.info('Changes detected, triggering apply process')
          await this.runApplyIfNotBusy('poll', applyTeamsOnly)
          this.d.info('Apply process completed successfully')
        }
      } catch (error) {
        this.d.error('Error during applying changes:', error)
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollInterval))
    }

    this.d.info('Polling loop stopped')
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.d.warn('Operator is already running')
      return
    }

    this.isRunning = true
    this.d.info('Starting APL operator')

    try {
      await waitTillGitRepoAvailable(this.repoUrl)
      await this.gitRepo.clone()
      await this.gitRepo.waitForCommits()
      await this.gitRepo.pull()

      await this.aplOps.bootstrap()
      await this.aplOps.validateValues()

      this.d.info('APL operator started successfully')
    } catch (error) {
      this.isRunning = false
      this.d.error('Failed to start APL operator:', error)
      throw error
    }

    try {
      await Promise.all([this.pollForChanges(), this.reconcile()])
    } catch (error) {
      this.d.error('Error in polling or reconcile task:', error)
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
