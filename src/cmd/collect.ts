import { Argv, CommandModule } from 'yargs'
import { module as tracesModule } from './traces'

export const module: CommandModule = {
  command: 'collect <command>',
  describe: 'Collect diagnostic information from the cluster',
  builder: (yargs: Argv): Argv => {
    return yargs.command(tracesModule as CommandModule).demandCommand(1, 'You must specify a subcommand')
  },
  handler: (): void => {
    // Handler is not called when subcommands are used
  },
}
