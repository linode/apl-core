import { module as applyModule } from '../cmd/apply'
import { module as applyAsAppsModule } from '../cmd/apply-as-apps'
import { module as applyTeamsModule } from '../cmd/apply-teams'
import { module as bootstrapModule } from '../cmd/bootstrap'
import { module as migrateModule } from '../cmd/migrate'
import { module as validateValuesModule } from '../cmd/validate-values'
import { OtomiDebugger, terminal } from '../common/debug'
import { HelmArguments } from '../common/yargs'
import { module as installModule } from '../cmd/install'
import { module as validateClusterModule } from '../cmd/validate-cluster'
import { OperatorError } from './errors'
import { getErrorMessage } from './utils'

export class AplOperations {
  private d: OtomiDebugger

  constructor() {
    this.d = terminal('operator:operations')
  }

  async migrate(): Promise<void> {
    this.d.info('Executing migration process')

    try {
      const args: HelmArguments = {
        nonInteractive: true,
        _: [] as string[],
        $0: '',
      } as HelmArguments
      await migrateModule.handler(args)
      this.d.info('Migration completed successfully')
    } catch (error) {
      this.d.error('Migration failed:', getErrorMessage(error))
      throw new OperatorError('Migration process failed', error as Error)
    }
  }

  async bootstrap(): Promise<void> {
    this.d.info('Executing bootstrap process')

    try {
      await bootstrapModule.handler({} as HelmArguments)
      this.d.info('Bootstrap completed successfully')
    } catch (error) {
      this.d.error('Bootstrap failed:', getErrorMessage(error))
      throw new OperatorError('Bootstrap process failed', error as Error)
    }
  }

  async validateValues(): Promise<void> {
    this.d.info('Validating values')

    try {
      await validateValuesModule.handler({} as HelmArguments)
      this.d.info('Values validation completed successfully')
    } catch (error) {
      this.d.error('Values validation failed:', getErrorMessage(error))
      throw new OperatorError('Values validation failed', error as Error)
    }
  }

  async apply(): Promise<void> {
    this.d.info('Executing apply')

    try {
      const args: HelmArguments = {
        tekton: true,
        _: [] as string[],
        $0: '',
      } as HelmArguments

      await applyModule.handler(args)
      this.d.info('Apply completed successfully')
    } catch (error) {
      this.d.error('Apply failed:', getErrorMessage(error))
      throw new OperatorError('Apply operation failed', error as Error)
    }
  }

  async applyTeams(): Promise<void> {
    this.d.info('Executing applyTeams')

    try {
      const args: HelmArguments = {
        _: [] as string[],
        $0: '',
      } as HelmArguments

      await applyTeamsModule.handler(args)
      this.d.info('ApplyTeams completed successfully')
    } catch (error) {
      this.d.error('ApplyTeams failed:', getErrorMessage(error))
      throw new OperatorError('ApplyTeams operation failed', error as Error)
    }
  }

  async applyAsAppsTeams(): Promise<void> {
    this.d.info('Executing applyAsApps for teams')

    try {
      const args: HelmArguments = {
        label: ['pipeline=otomi-task-teams'],
      } as HelmArguments

      await applyAsAppsModule.handler(args)
      this.d.info('ApplyAsApps for teams completed successfully')
    } catch (error) {
      this.d.error('ApplyAsApps for teams failed:', getErrorMessage(error))
      throw new OperatorError('ApplyAsApps for teams failed', error as Error)
    }
  }

  async validateCluster(): Promise<void> {
    this.d.info('Validating cluster')

    try {
      await validateClusterModule.handler({} as HelmArguments)
      this.d.info('Cluster validation completed successfully')
    } catch (error) {
      this.d.error('Cluster validation failed:', getErrorMessage(error))
      throw new OperatorError('Cluster validation failed', error as Error)
    }
  }

  async install(): Promise<void> {
    this.d.info('Executing install process')

    try {
      await installModule.handler({} as HelmArguments)
      this.d.info('Install completed successfully')
    } catch (error) {
      this.d.error('Install failed:', getErrorMessage(error))
      throw new OperatorError('Install process failed', error as Error)
    }
  }
}
