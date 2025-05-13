import simpleGit, { SimpleGit } from 'simple-git'
import { terminal } from '../common/debug'
import * as fs from 'fs'
import { HelmArguments } from '../common/yargs'

import { module as applyModule } from '../cmd/apply'
import { module as applyAsAppsModule } from '../cmd/apply-as-apps'
import { module as bootstrapModule } from '../cmd/bootstrap'
import { module as validateValuesModule } from '../cmd/validate-values'
import { setValuesFile } from '../common/repo'
import { waitTillGitRepoAvailable } from '../common/k8s'
import { env } from '../common/envalid'
import path from 'path'

export class AplOperator {
  private d = terminal('operator:apl')
  private isRunning = false
  private pollInterval = 1000
  private lastRevision = ''
  private repoPath: string
  private repoUrl: string
  private git: SimpleGit

  constructor(
    username: string,
    password: string,
    giteaUrl: string,
    giteaProtocol: string,
    repoPath: string,
    pollIntervalMs?: number,
  ) {
    this.pollInterval = pollIntervalMs ? pollIntervalMs : this.pollInterval
    this.repoPath = repoPath
    const giteaOrg = 'otomi'
    const giteaRepo = 'values'
    //TODO change this when going in to cluster
    this.repoUrl = `${giteaProtocol}://${username}:${password}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git`

    this.git = simpleGit({
      baseDir: this.repoPath,
    })

    this.d.info(`Initialized APL operator with repo URL: ${this.repoUrl.replace(password, '***')}`)
  }

  private async waitForGitea(): Promise<void> {
    await waitTillGitRepoAvailable(this.repoUrl)
    await this.git.raw(['config', '--global', '--add', 'safe.directory', this.repoPath])
  }

  private async cloneRepository(): Promise<void> {
    this.d.info(`Cloning repository to ${this.repoPath}`)

    try {
      await this.git.clone(this.repoUrl, this.repoPath)

      const log = await this.git.log({ maxCount: 1 })
      this.lastRevision = log.latest?.hash || ''

      this.d.info(`Repository cloned successfully, current revision: ${this.lastRevision}`)
    } catch (error) {
      this.d.error('Failed to clone repository:', error)
      throw error
    }
  }

  private async shouldSkipCommit(commitHash: string): Promise<boolean> {
    try {
      const logResult = await this.git.log({ maxCount: 1, from: commitHash, to: commitHash })

      if (!logResult.latest) {
        return false
      }

      const commitMessage = logResult.latest.message || ''
      const skipMarker = '[ci skip]'

      const shouldSkip = commitMessage.includes(skipMarker)

      if (shouldSkip) {
        this.d.info(`Commit ${commitHash.substring(0, 7)} contains "${skipMarker}" - skipping apply`)
      }

      return shouldSkip
    } catch (error) {
      this.d.error(`Error checking commit message for ${commitHash}:`, error)
      return false
    }
  }

  private async pullRepository(): Promise<boolean> {
    this.d.info('Pulling latest changes from repository')

    try {
      const previousRevision = this.lastRevision

      await this.git.pull()

      const log = await this.git.log({ maxCount: 1 })
      const newRevision = log.latest?.hash || ''

      if (newRevision && newRevision !== previousRevision) {
        this.d.info(`Repository updated: ${previousRevision} -> ${newRevision}`)

        const shouldSkip = await this.shouldSkipCommit(newRevision)

        this.lastRevision = newRevision

        return !shouldSkip
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
      const args: HelmArguments = {
        tekton: true,
        _: [] as string[],
        $0: '',
      } as HelmArguments

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
      const args: HelmArguments = {
        label: ['pipeline=otomi-task-teams'],
      } as HelmArguments

      await applyAsAppsModule.handler(args)

      this.d.info('ApplyAsApps for teams completed successfully')
    } catch (error) {
      this.d.error('ApplyAsApps for teams failed:', error)
      throw error
    }
  }

  private async pollForChangesAndApplyIfAny(): Promise<void> {
    this.d.info('Starting polling loop')

    while (this.isRunning) {
      try {
        const hasChanges = await this.pullRepository()

        if (hasChanges) {
          this.d.info('Changes detected, triggering apply process')

          // Execute them not in parallel as it resulted in issues
          await this.executeApply()
          await this.executeApplyAsApps()

          this.d.info('Apply process completed successfully')
        } else {
          this.d.info('No changes detected')
        }

        await new Promise((resolve) => setTimeout(resolve, this.pollInterval))
      } catch (error) {
        this.d.error('Error during applying changes:', error)

        // Optionally create prometheus metrics or alerts here
        await new Promise((resolve) => setTimeout(resolve, this.pollInterval))
      }
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
      await this.waitForGitea()

      await this.cloneRepository()

      await this.executeBootstrap()

      await this.executeValidateValues()

      await this.executeApply()
      await this.executeApplyAsApps()

      await this.pollForChangesAndApplyIfAny()

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
