import simpleGit, { SimpleGit } from 'simple-git'
import { terminal } from '../common/debug'
import * as fs from 'fs'
import retry from 'async-retry'
import { HelmArguments } from '../common/yargs'
import { prepareEnvironment } from '../common/cli'
import { decrypt } from '../common/crypt'

import { module as applyModule } from '../cmd/apply'
import { module as applyAsAppsModule } from '../cmd/apply-as-apps'
import { module as bootstrapModule } from '../cmd/bootstrap'
import { module as validateValuesModule } from '../cmd/validate-values'
import { setValuesFile } from '../common/repo'

export class AplOperator {
  private d = terminal('operator:apl')
  private isRunning = false
  private pollInterval = 1000
  private lastRevision = ''
  private repoPath = '/tmp/apl-operator/values'
  private repoUrl: string
  private git: SimpleGit

  constructor(username: string, password: string, giteaUrl: string, pollIntervalMs?: number) {
    this.pollInterval = pollIntervalMs ? pollIntervalMs : this.pollInterval

    const giteaOrg = 'otomi'
    const giteaRepo = 'values'
    //TODO change this when going in to cluster
    this.repoUrl = `https://${username}:${password}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git`

    // Remove existing directory if it exists
    if (fs.existsSync(this.repoPath)) {
      this.d.info('Removing existing repository directory')
      fs.rmSync(this.repoPath, { recursive: true, force: true })
    }

    // Ensure parent directory exists
    if (!fs.existsSync(this.repoPath)) {
      fs.mkdirSync(this.repoPath, { recursive: true })
    }

    this.git = simpleGit({
      baseDir: this.repoPath,
    })

    this.d.info(`Initialized APL operator with repo URL: ${this.repoUrl.replace(password, '***')}`)
  }

  private async waitForGitea(): Promise<boolean> {
    this.d.info('Waiting for Gitea to be available...')

    const maxRetries = 30
    const retryDelay = 30000 // 30 seconds

    return retry(
      async () => {
        try {
          await this.git.listRemote(['--heads', this.repoUrl])
          this.d.info('Gitea is available and repository is accessible')
          return true
        } catch (error) {
          this.d.warn(`Gitea not available yet: ${error.message}`)
          throw new Error('Gitea not available')
        }
      },
      {
        retries: maxRetries,
        minTimeout: retryDelay,
        maxTimeout: retryDelay,
        onRetry: (error: any, attempt) => {
          this.d.info(`Retry attempt ${attempt}/${maxRetries} - ${error.message}`)
        },
      },
    )
  }

  private async cloneRepository(): Promise<void> {
    this.d.info(`Cloning repository to ${this.repoPath}`)

    // Clone the repository
    try {
      await this.git.clone(this.repoUrl, this.repoPath)

      // Get the current commit hash
      const log = await this.git.log({ maxCount: 1 })
      this.lastRevision = log.latest?.hash || ''

      this.d.info(`Repository cloned successfully, current revision: ${this.lastRevision}`)
    } catch (error) {
      this.d.error('Failed to clone repository:', error)
      throw error
    }
  }

  private async pullRepository(): Promise<boolean> {
    this.d.info('Pulling latest changes from repository')

    try {
      // Pull the latest changes
      await this.git.pull()

      // Get a new commit hash
      const log = await this.git.log({ maxCount: 1 })
      const newRevision = log.latest?.hash || null

      // Check if there are changes
      if (newRevision && newRevision !== this.lastRevision) {
        this.d.info(`Repository updated: ${this.lastRevision} -> ${newRevision}`)
        this.lastRevision = newRevision
        return true
      } else {
        this.d.info('No changes detected in repository')
        return false
      }
    } catch (error) {
      this.d.error('Failed to pull repository:', error)
      throw error
    }
  }

  private async executeBootstrap(): Promise<void> {
    this.d.info('Executing bootstrap process')

    try {
      process.env.ENV_DIR = this.repoPath
      await bootstrapModule.handler({} as HelmArguments)
      await setValuesFile(this.repoPath)
      this.d.info('Bootstrap completed successfully')
    } catch (error) {
      this.d.error('Bootstrap failed:', error)
      throw error
    }
  }

  private async executeValidateValues(): Promise<void> {
    this.d.info('Validating values')

    try {
      // Execute validate-values command
      process.env.ENV_DIR = this.repoPath
      await validateValuesModule.handler({} as HelmArguments)
      this.d.info('Values validation completed successfully')
    } catch (error) {
      this.d.error('Values validation failed:', error)
      throw error
    }
  }

  private async executeApply(): Promise<void> {
    this.d.info('Executing apply')

    try {
      // Prepare the environment and set ENV_DIR
      process.env.ENV_DIR = this.repoPath

      // We need to prepare and parse arguments as expected by the apply module
      const args: HelmArguments = { args: '--tekton' } as HelmArguments

      // Use the handler from the module
      await applyModule.handler(args)

      this.d.info('Apply completed successfully')
    } catch (error) {
      this.d.error('Apply failed:', error)
      throw error
    }
  }

  private async executeApplyAsApps(): Promise<void> {
    this.d.info('Executing applyAsApps for teams')

    try {
      // Set the environment
      process.env.ENV_DIR = this.repoPath

      const args: HelmArguments = {
        l: ['pipeline=otomi-task-teams'],
      } as HelmArguments

      // Use the handler from the module
      await applyAsAppsModule.handler(args)

      this.d.info('ApplyAsApps for teams completed successfully')
    } catch (error) {
      this.d.error('ApplyAsApps for teams failed:', error)
      throw error
    }
  }

  private async pollForChanges(): Promise<void> {
    if (!this.isRunning) return

    try {
      const hasChanges = await this.pullRepository()

      if (hasChanges) {
        this.d.info('Changes detected, triggering apply process')

        // Execute the following in parallel
        await Promise.all([this.executeApply(), this.executeApplyAsApps()])

        this.d.info('Apply process completed successfully')
      }

      // Schedule next poll
      setTimeout(() => {
        void this.pollForChanges()
      }, this.pollInterval)
    } catch (error) {
      this.d.error('Error during polling:', error)

      // If we encounter an error, retry after a delay
      if (this.isRunning) {
        this.d.info(`Retrying in ${this.pollInterval}ms`)
        setTimeout(() => {
          void this.pollForChanges()
        }, this.pollInterval)
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.d.warn('Operator is already running')
      return
    }

    this.isRunning = true
    this.d.info('Starting APL operator')

    try {
      // Step 1: Wait for Gitea to be available
      await this.waitForGitea()

      await this.cloneRepository()

      await this.executeBootstrap()

      await this.executeValidateValues()

      await Promise.all([this.executeApply(), this.executeApplyAsApps()])

      await this.pollForChanges()

      this.d.info('APL operator started successfully')
    } catch (error) {
      this.isRunning = false
      this.d.error('Failed to start APL operator:', error)
      throw error
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
