import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiDebugger, terminal } from '../common/debug'
import retry, { Options } from 'async-retry'
import { $, cd } from 'zx'
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
    await retry(async (bail) => {
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

  async pull(): Promise<{ hasChanges: boolean; shouldSkip: boolean; applyTeamsOnly: boolean }> {
    try {
      const previousRevision = this._lastRevision

      await this.git.pull()

      const logs = await this.git.log({ maxCount: 1 })
      const newRevision = logs.latest?.hash || ''

      if (newRevision && newRevision !== previousRevision) {
        this.d.info(`Repository updated: ${previousRevision} -> ${newRevision}`)

        const logResult = await this.git.log({
          from: previousRevision,
          to: 'HEAD',
        })

        const skipMarker = '[ci skip]'
        const allCommitsContainSkipMarker = logResult.all.every((commit) => commit.message.includes(skipMarker))

        if (allCommitsContainSkipMarker) {
          this.d.info(`All new commits contain "${skipMarker}" - skipping apply`)
        }

        // Get all changed files between revisions
        const diffResult = await this.git.diff([`${previousRevision}..${newRevision}`, '--name-only'])
        const changedFiles = diffResult.split('\n').filter((file) => file.trim().length > 0)

        // Check if all changes are in teams directory
        const onlyTeamsChanged =
          changedFiles.length > 0 &&
          changedFiles.every((file) => file.startsWith('env/teams/') || file.startsWith('teams/'))

        if (onlyTeamsChanged) {
          this.d.info('All changes are in teams directory - applying teams only')
        }

        this._lastRevision = newRevision

        return {
          hasChanges: true,
          shouldSkip: allCommitsContainSkipMarker,
          applyTeamsOnly: onlyTeamsChanged,
        }
      } else {
        return {
          hasChanges: false,
          shouldSkip: false,
          applyTeamsOnly: false,
        }
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
