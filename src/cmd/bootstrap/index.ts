import { Argv } from 'yargs'
import { BasicArguments } from '../../common/utils'
import { bootstrapGit, module as gitModule } from './git'
import { bootstrapValues, module as valuesModule } from './values'

export { module as git } from './git'
export { module as values } from './values'
export const commands = [gitModule, valuesModule]
export type Arguments = BasicArguments

const fileName = 'bootstrap'

export const module = {
  command: fileName,
  hidden: true,
  describe: 'Bootstrap all necessary settings and values',
  builder: (parser: Argv): Argv => {
    commands.map((cmd) => parser.command(cmd))
    return parser
  },
  handler: async (argv: Arguments): Promise<void> => {
    await bootstrapValues(argv)
    await bootstrapGit(argv)
  },
}
export default module
