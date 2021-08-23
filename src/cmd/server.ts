import { Argv } from 'yargs'
import { cleanupHandler, prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { startServer, stopServer } from '../server/index'

type Arguments = BasicArguments

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

const cleanup = (): void => {
  debug.log('Stopping server')
  stopServer()
}

const setup = (argv: Arguments): void => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup())
}

export const server = (): void => {
  debug.info('Starting server')
  startServer()
}

export const module = {
  command: cmdName,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    setup(argv)
    server()
  },
}

export default module
