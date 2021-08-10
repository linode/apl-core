import { Argv, CommandModule } from 'yargs'
import { $, nothrow } from 'zx'
import { cleanupHandler, prepareEnvironment, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, OtomiDebugger, parser, setParsedArgs, terminal } from '../common/utils'

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: BasicArguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await prepareEnvironment(options)
}

export const bash = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
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
    await bash(argv, { skipKubeContextCheck: true, skipDecrypt: true })
  },
}

export default module
