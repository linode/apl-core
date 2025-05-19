import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiDebugger, terminal } from '../common/debug'
import retry, { Options } from 'async-retry'
import { OperatorError } from './errors'

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

  async hasCommits(): Promise<boolean> {
    try {
      const logs = await this.git.log({ maxCount: 1 })
      return logs.latest !== undefined && logs.total > 0
    } catch (error) {
      this.d.warn('Gitea has no commits yet:', error)
      throw error
    }
  }

  async waitForCommits(maxRetries = 30, interval = 10000): Promise<void> {
    this.d.info(`Waiting for repository to have commits (max ${maxRetries} retries, ${interval}ms interval)`)

    const retryOptions: Options = {
      retries: 20,
      maxTimeout: 30000,
    }
    const d = terminal('common:k8s:waitTillGitRepoAvailable')
    await retry(async () => {
      try {
        await this.hasCommits()
      } catch (e) {
        d.warn(`The values repository has no commits yet. Retrying in ${retryOptions.maxTimeout} ms`)
        throw e
      }
    }, retryOptions)
  }

  async clone(): Promise<string> {
    this.d.info(`Cloning repository to ${this.repoPath}`)

    try {
      await this.git.clone(this.repoUrl, this.repoPath)

      const logs = await this.git.log({ maxCount: 1 })
      this._lastRevision = logs.latest?.hash || ''

      this.d.info(`Repository cloned successfully, revision: ${this._lastRevision}`)
      return this._lastRevision
    } catch (error) {
      this.d.error('Failed to clone repository:', error)
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

  async pull(): Promise<{ hasChangesToApply: boolean; applyTeamsOnly: boolean }> {
    try {
      const previousRevision = this._lastRevision

      await this.git.pull()

      const logs = await this.git.log({ maxCount: 1 })
      const newRevision = logs.latest?.hash || ''

      if (!newRevision || newRevision === previousRevision) {
        return {
          hasChangesToApply: false,
          applyTeamsOnly: false,
        }
      }

      this.d.info(`Repository updated: ${previousRevision} -> ${newRevision}`)

      // Default result if the previous revision is empty (first run)
      if (!previousRevision) {
        this._lastRevision = newRevision
        return {
          hasChangesToApply: true,
          applyTeamsOnly: false,
        }
      }

      const allCommitsContainSkipMarker = await this.shouldSkipCommits(previousRevision, 'HEAD')
      if (allCommitsContainSkipMarker) {
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

      this._lastRevision = newRevision

      return {
        hasChangesToApply: true,
        applyTeamsOnly: onlyTeamsChanged,
      }
    } catch (error) {
      this.d.error('Failed to pull repository:', error)
      throw new OperatorError('Repository pull failed', error as Error)
    }
  }
  public get lastRevision(): string {
    return this._lastRevision
  }
}
