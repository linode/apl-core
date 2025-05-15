import simpleGit, { SimpleGit } from 'simple-git'
import { OtomiDebugger, terminal } from '../common/debug'

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

  async pull(): Promise<{ hasChanges: boolean; shouldSkip: boolean }> {
    try {
      const previousRevision = this._lastRevision

      await this.git.pull()

      const logs = await this.git.log({ maxCount: 1 })
      const newRevision = logs.latest?.hash || ''
      const commitMessage = logs.latest?.message || ''

      if (newRevision && newRevision !== previousRevision) {
        this.d.info(`Repository updated: ${previousRevision} -> ${newRevision}`)

        const skipMarker = '[ci skip]'
        const shouldSkip = commitMessage.includes(skipMarker)

        if (shouldSkip) {
          this.d.info(`Commit ${newRevision.substring(0, 7)} contains "${skipMarker}" - skipping apply`)
        }

        this._lastRevision = newRevision

        return { hasChanges: true, shouldSkip }
      } else {
        return { hasChanges: false, shouldSkip: false }
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
