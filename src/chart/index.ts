import { Argv } from 'yargs'
import { parser as globalParser } from '../common/no-deps'
import bootstrapModule from './bootstrap'

export { default as bootstrap } from './bootstrap'
export const commands = [bootstrapModule]

const fileName = 'chart'
export const module = {
  command: fileName,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv => {
    commands.map((cmd) => parser.command(cmd))
    return parser
  },
  handler: (): void => {
    globalParser.showHelp()
  },
}
export default module
