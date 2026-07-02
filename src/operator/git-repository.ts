import * as fs from 'fs'
import * as path from 'path'
import { Readable } from 'stream'
import simpleGit, { SimpleGit } from 'simple-git'
import { setIdentity } from '../common/bootstrap'
import { OtomiDebugger, terminal } from '../common/debug'
import { GitRepoConfig } from '../common/git-config'
import { OperatorError } from './errors'
import { getErrorMessage } from './utils'
import { isEqual } from 'lodash'

export interface GitRepositoryConfig {
  authenticatedUrl: string // Full URL with credentials already embedded
  repoUrl: string
  password: string
  repoPath: string
  branch: string
  username?: string
  email: string
  gitOpTimeoutMs: number
}

export class GitRepository {
  private _lastRevision = ''
  private d: OtomiDebugger
  private _config: GitRepoConfig
  private readonly repoPath: string
  private branch: string
  private username: string
  private email: string
  private readonly skipMarker = '[ci skip]'
  private readonly gitTimeoutMs: number

  constructor(config: GitRepositoryConfig) {
    this.d = terminal('operator:git-repository')
    this.repoPath = config.repoPath
    this.branch = config.branch
    this.username = config.username ?? 'otomi-admin'
    this.email = config.email
    this.git = simpleGit({
      baseDir: this.repoPath,
      timeout: { block: config.gitOpTimeoutMs },
    })
    this._config = {
      repoUrl: config.repoUrl,
      authenticatedUrl: config.authenticatedUrl,
      branch: config.branch,
      email: config.email,
      username: config.username,
      password: config.password,
    }
  }

  // Creates a fresh simpleGit instance per call and explicitly destroys the
  // stdio pipe handles (stdout + stderr) after the operation completes.
  // Without this, each spawned git process leaves libuv handles alive that
  // accumulate over time and eventually exhaust the OS thread limit.
  private async withGit<T>(op: (git: SimpleGit) => Promise<T>): Promise<T> {
    const handles: Readable[] = []
    const git = simpleGit(this.repoPath, { timeout: { block: this.gitTimeoutMs } }).outputHandler(
      (_cmd, stdout, stderr) => {
        handles.push(stdout as unknown as Readable, stderr as unknown as Readable)
      },
    )
    try {
      return await op(git)
    } finally {
      for (const s of handles) if (!s.destroyed) s.destroy()
    }
  }

  get authenticatedUrl(): string {
    return this._config.authenticatedUrl
  }

  get config(): GitRepoConfig {
    return this._config
  }

  async setLastRevision(): Promise<void> {
    try {
      const logs = await this.withGit((git) => git.log({ maxCount: 1 }))
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
    const gitPath = path.join(this.repoPath, '.git')
    if (fs.existsSync(gitPath)) {
      this.d.info(`Repository already exists at ${this.repoPath}, skipping clone`)
      await this.verifyAndFixOriginRemote()
    } else {
      this.d.info(`Cloning repository to ${this.repoPath}`)
      try {
        await this.withGit((git) => git.clone(this._config.authenticatedUrl, this.repoPath, ['-b', this.branch]))
        this.d.info(`Repository cloned successfully`)
      } catch (error) {
        this.d.error('Failed to clone repository:', getErrorMessage(error))
        throw new OperatorError('Repository clone failed', error as Error)
      }
    }
    await setIdentity(this.username, this.email, this.repoPath)
  }

  private async verifyAndFixOriginRemote(): Promise<void> {
    try {
      const remotes = await this.withGit((git) => git.getRemotes(true))
      const origin = remotes.find((r) => r.name === 'origin')

      if (!origin) {
        this.d.warn('Origin remote not found, adding it')
        await this.withGit((git) => git.remote(['add', 'origin', this._config.authenticatedUrl]))
        this.d.info('Origin remote added successfully')
        return
      }

      if (origin.refs.fetch !== this._config.authenticatedUrl) {
        this.d.warn('Origin remote URL mismatch detected, resetting to correct URL')
        await this.withGit((git) => git.remote(['set-url', 'origin', this._config.authenticatedUrl]))
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
    const diffResult = await this.withGit((git) => git.diff([`${fromRevision}..${toRevision}`, '--name-only']))
    return diffResult.split('\n').filter((file) => file.trim().length > 0)
  }

  private isTeamsOnlyChange(changedFiles: string[]): boolean {
    return (
      changedFiles.length > 0 &&
      changedFiles.every((file) => file.startsWith('env/teams/') || file.startsWith('teams/'))
    )
  }

  private async shouldSkipCommits(fromRevision: string, toRevision: string): Promise<boolean> {
    const logResult = await this.withGit((git) => git.log({ from: fromRevision, to: toRevision }))
    return logResult.all.every((commit) => commit.message.includes(this.skipMarker))
  }

  private async pull(): Promise<string> {
    try {
      return await this.withGit(async (git) => {
        await git.clean('f', ['-X'])
        await git.fetch('origin', this.branch)
        await git.reset(['--hard', `origin/${this.branch}`])
        const logs = await git.log({ maxCount: 1 })
        return logs.latest?.hash || ''
      })
    } catch (error) {
      this.d.error('Failed to pull repository:', getErrorMessage(error))
      throw new OperatorError('Repository pull failed', error as Error)
    }
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

  async reloadConfig(config: GitRepoConfig): Promise<void> {
    if (isEqual(config, this._config)) {
      return
    }
    try {
      await this.withGit((git) => git.remote(['set-url', 'origin', config.authenticatedUrl]))
      this.branch = config.branch
      this.username = config.username ?? 'otomi-admin'
      this.email = config.email
      this._config = config
      await setIdentity(this.username, this.email, this.repoPath)
      this.d.info('Git config reloaded successfully')
    } catch (error) {
      this.d.error('Failed to reload git config:', getErrorMessage(error))
      throw new OperatorError('Git config reload failed', error as Error)
    }
  }

  public get lastRevision(): string {
    return this._lastRevision
  }
}
