import { Argv, CommandModule } from 'yargs'
import { $, nothrow } from 'zx'
import { prepareEnvironment } from '../common/setup'
import {
  BasicArguments,
  getFilename,
  getParsedArgs,
  OtomiDebugger,
  parser,
  setParsedArgs,
  terminal,
} from '../common/utils'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const bash = async (): Promise<void> => {
  const argv: BasicArguments = getParsedArgs()
  if (argv._[0] === 'bash') parser.showHelp()
  else {
    const command = argv._.slice(1).join(' ')
    const output = await nothrow($`${command}`)
    output.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => debug.log(line))
    output.stderr
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => debug.error(line))
    process.exit(output.exitCode)
  }
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Run interactive bash shell in otomi-core container',
  builder: (args: Argv): Argv => args,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true, skipDecrypt: true })
    await bash()
  },
}

export default module
