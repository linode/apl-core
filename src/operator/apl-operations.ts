import { OtomiDebugger, terminal } from '../common/debug'
import { HelmArguments } from '../common/yargs'
import { module as applyModule } from '../cmd/apply'
import { module as applyAsAppsModule } from '../cmd/apply-as-apps'
import { module as bootstrapModule } from '../cmd/bootstrap'
import { module as validateValuesModule } from '../cmd/validate-values'

export class AplOperations {
  private d: OtomiDebugger

  constructor() {
    this.d = terminal('AplOperations')
  }

  async bootstrap(): Promise<void> {
    this.d.info('Executing bootstrap process')

    try {
      await bootstrapModule.handler({} as HelmArguments)
      this.d.info('Bootstrap completed successfully')
    } catch (error) {
      this.d.error('Bootstrap failed:', error)
      throw new OperatorError('Bootstrap process failed', error as Error)
    }
  }

  async validateValues(): Promise<void> {
    this.d.info('Validating values')

    try {
      await validateValuesModule.handler({} as HelmArguments)
      this.d.info('Values validation completed successfully')
    } catch (error) {
      this.d.error('Values validation failed:', error)
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
      this.d.error('Apply failed:', error)
      throw new OperatorError('Apply operation failed', error as Error)
    }
  }

  async applyAsApps(): Promise<void> {
    this.d.info('Executing applyAsApps for teams')

    try {
      const args: HelmArguments = {
        label: ['pipeline=otomi-task-teams'],
      } as HelmArguments

      await applyAsAppsModule.handler(args)
      this.d.info('ApplyAsApps for teams completed successfully')
    } catch (error) {
      this.d.error('ApplyAsApps for teams failed:', error)
      throw new OperatorError('ApplyAsApps for teams failed', error as Error)
    }
  }
}
