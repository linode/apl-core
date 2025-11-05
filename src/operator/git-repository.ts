import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiDebugger, terminal } from '../common/debug'
import retry from 'async-retry'
import { OperatorError } from './errors'
import { getErrorMessage } from './utils'
import { env } from '../common/envalid'

export interface GitRepositoryConfig {
  username: string
  password: string
  gitHost: string
  gitPort: string
  gitProtocol: string
  repoPath: string
  gitOrg: string
  gitRepo: string
}

export class GitRepository {
  private git: SimpleGit
  private _lastRevision = ''
  private d: OtomiDebugger
  readonly repoUrl: string
  private readonly repoPath: string
  private readonly skipMarker = '[ci skip]'

  constructor(config: GitRepositoryConfig) {
    const { username, password, gitHost, gitPort, gitProtocol, repoPath, gitOrg, gitRepo } = config
    this.d = terminal('GitRepository')
    this.repoUrl = `${gitProtocol}://${username}:${password}@${gitHost}:${gitPort}/${gitOrg}/${gitRepo}.git`
    this.repoPath = repoPath
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
      this.d.warn('Gitea has no commits yet:', getErrorMessage(error))
      throw error
    }
  }

  async waitForCommits(maxRetries = env.RETRIES, interval = env.MIN_TIMEOUT): Promise<void> {
    this.d.info(`Waiting for repository to have commits (max ${maxRetries} retries, ${interval}ms interval)`)

    const d = terminal('common:k8s:waitTillGitRepoAvailable')
    await retry(
      async () => {
        try {
          await this.git.pull('origin', 'main')
          await this.setLastRevision()
        } catch (e) {
          d.warn(`The values repository has no commits yet. Retrying in ${interval} ms`)
          throw e
        }
      },
      { retries: maxRetries, randomize: env.RANDOM, minTimeout: interval, factor: env.FACTOR },
    )
  }

  async clone(): Promise<void> {
    this.d.info(`Cloning repository to ${this.repoPath}`)

    try {
      await this.git.clone(this.repoUrl, this.repoPath)
      this.d.info(`Repository cloned successfully`)
    } catch (error) {
      this.d.error('Failed to clone repository:', getErrorMessage(error))
      throw new OperatorError('Repository clone failed', error as Error)
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
