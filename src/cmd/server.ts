import { Argv } from 'yargs'
import { cleanupHandler, prepareEnvironment, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { startServer, stopServer } from '../server/index'

type Arguments = BasicArguments

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  debug.log('Stopping server')
  stopServer()
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await prepareEnvironment(options)
}

export const server = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('Starting server')
  startServer()
}

export const module = {
  command: cmdName,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await server(argv, {})
  },
}

export default module
