import { terminal } from '../common/debug'
import { waitTillGitRepoAvailable } from '../common/k8s'
import { GitRepository } from './git-repository'
import { AplOperations } from './apl-operations'
import { updateApplyState } from './k8s'
import { ensureTeamGitOpsDirectories } from '../common/utils'
import { env } from '../common/envalid'
import { commit } from '../cmd/commit'
import { HelmArguments } from '../common/yargs'
import { hfValues } from '../common/hf'
import { writeValues } from '../common/values'
import { getErrorMessage } from './utils'
import { decrypt } from 'src/common/crypt'

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
      const defaultValues = (await hfValues({ defaultValues: true })) as Record<string, any>
      this.d.info('Write default values to env repo')
      await writeValues(defaultValues)

      if (trigger === ApplyTrigger.Poll) {
        await this.aplOps.migrate()

        this.d.info(`[${trigger}] Starting validation process`)
        await this.aplOps.validateValues()
        this.d.info(`[${trigger}] Validation process completed`)
      }
      if (trigger === ApplyTrigger.Reconcile) {
        await decrypt()
      }
      await ensureTeamGitOpsDirectories(env.ENV_DIR)

      await commit(false, {} as HelmArguments) // Pass an empty object to clear any stale parsed args

      if (applyTeamsOnly) {
        await this.aplOps.applyAsAppsTeams()
      } else {
        await this.aplOps.apply()
      }
      this.d.info(`[${trigger}] Apply process completed`)

      await updateApplyState({
        commitHash,
        status: 'succeeded',
        timestamp: new Date().toISOString(),
        trigger,
      })
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
      await waitTillGitRepoAvailable(this.repoUrl)
      await this.gitRepo.clone()
      await this.gitRepo.waitForCommits()
      await this.gitRepo.syncAndAnalyzeChanges()

      await this.aplOps.bootstrap()
      await this.aplOps.validateValues()

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
