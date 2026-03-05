import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiDebugger, terminal } from '../common/debug'
import { OperatorError } from './errors'
import { getErrorMessage } from './utils'
import * as fs from 'fs'
import * as path from 'path'

export interface GitRepositoryConfig {
  authenticatedUrl: string // Full URL with credentials already embedded
  repoPath: string
}

export class GitRepository {
  private git: SimpleGit
  private _lastRevision = ''
  private d: OtomiDebugger
  readonly authenticatedUrl: string
  private readonly repoPath: string
  private readonly skipMarker = '[ci skip]'

  constructor(config: GitRepositoryConfig) {
    this.d = terminal('operator:git-repository')
    this.authenticatedUrl = config.authenticatedUrl
    this.repoPath = config.repoPath
    this.git = simpleGit(this.repoPath)
  }

  async setLastRevision(): Promise<void> {
    try {
      const logs = await this.git.log({ maxCount: 1 })
      const hasCommits = logs.latest !== undefined && logs.total > 0
      if (hasCommits) {
        this._lastRevision = logs.latest?.hash || ''
      }
    } catch (error) {
      this.d.warn('Git has no commits yet:', getErrorMessage(error))
      throw error
    }
  }

  async clone(): Promise<void> {
    // Check if the repository already exists locally
    const gitPath = path.join(this.repoPath, '.git')
    if (fs.existsSync(gitPath)) {
      this.d.info(`Repository already exists at ${this.repoPath}, skipping clone`)
      await this.verifyAndFixOriginRemote()
      return
    }

    this.d.info(`Cloning repository to ${this.repoPath}`)

    try {
      await this.git.clone(this.authenticatedUrl, this.repoPath)
      this.d.info(`Repository cloned successfully`)
    } catch (error) {
      this.d.error('Failed to clone repository:', getErrorMessage(error))
      throw new OperatorError('Repository clone failed', error as Error)
    }
  }

  private async verifyAndFixOriginRemote(): Promise<void> {
    try {
      const remotes = await this.git.getRemotes(true)
      const origin = remotes.find((r) => r.name === 'origin')

      if (!origin) {
        this.d.warn('Origin remote not found, adding it')
        await this.git.remote(['add', 'origin', this.authenticatedUrl])
        this.d.info('Origin remote added successfully')
        return
      }

      if (origin.refs.fetch !== this.authenticatedUrl) {
        this.d.warn('Origin remote URL mismatch detected, resetting to correct URL')
        await this.git.remote(['set-url', 'origin', this.authenticatedUrl])
        this.d.info('Origin remote URL reset successfully')
      } else {
        this.d.debug('Origin remote URL is correct')
      }
    } catch (error) {
      this.d.error('Failed to verify/fix origin remote:', getErrorMessage(error))
      throw new OperatorError('Origin remote verification failed', error as Error)
    }
  }

  private async getChangedFiles(fromRevision: string, toRevision: string): Promise<string[]> {
    const diffResult = await this.git.diff([`${fromRevision}..${toRevision}`, '--name-only'])
    return diffResult.split('\n').filter((file) => file.trim().length > 0)
  }

  private isTeamsOnlyChange(changedFiles: string[]): boolean {
    return (
      changedFiles.length > 0 &&
      changedFiles.every((file) => file.startsWith('env/teams/') || file.startsWith('teams/'))
    )
  }

  private async shouldSkipCommits(fromRevision: string, toRevision: string): Promise<boolean> {
    const logResult = await this.git.log({
      from: fromRevision,
      to: toRevision,
    })

    return logResult.all.every((commit) => commit.message.includes(this.skipMarker))
  }

  private async pull(): Promise<string> {
    try {
      // to avoid re-creating deleted teams and users
      // and to clean-up the untracked files
      await this.git.clean('f', ['-X'])
      await this.git.pull('origin', 'main')
      return this.getCurrentRevision()
    } catch (error) {
      this.d.error('Failed to pull repository:', getErrorMessage(error))
      throw new OperatorError('Repository pull failed', error as Error)
    }
  }

  private async getCurrentRevision(): Promise<string> {
    const logs = await this.git.log({ maxCount: 1 })
    return logs.latest?.hash || ''
  }

  async syncAndAnalyzeChanges(): Promise<{ hasChangesToApply: boolean; applyTeamsOnly: boolean }> {
    try {
      const previousRevision = this._lastRevision

      const newRevision = await this.pull()

      if (!newRevision || newRevision === previousRevision) {
        return {
          hasChangesToApply: false,
          applyTeamsOnly: false,
        }
      }
      this.d.info(`Repository updated: ${previousRevision} -> ${newRevision}`)
      this._lastRevision = newRevision

      if (!previousRevision) {
        return {
          hasChangesToApply: true,
          applyTeamsOnly: false,
        }
      }

      const shouldSkip = await this.shouldSkipCommits(previousRevision, 'HEAD')
      if (shouldSkip) {
        this.d.info(`All new commits contain "[ci skip]" - skipping apply`)
        return {
          hasChangesToApply: false,
          applyTeamsOnly: false,
        }
      }

      const changedFiles = await this.getChangedFiles(previousRevision, newRevision)
      const onlyTeamsChanged = this.isTeamsOnlyChange(changedFiles)

      if (onlyTeamsChanged) {
        this.d.info('All changes are in teams directory - applying teams only')
      }

      return {
        hasChangesToApply: true,
        applyTeamsOnly: onlyTeamsChanged,
      }
    } catch (error) {
      this.d.error('Failed to analyze repository changes:', getErrorMessage(error))
      throw new OperatorError('Repository sync and analysis failed', error as Error)
    }
  }
  public get lastRevision(): string {
    return this._lastRevision
  }
}
