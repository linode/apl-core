import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/setup.js'
import { BasicArguments, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils.js'
import { startServer } from '../server/index.js'

type Arguments = BasicArguments

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

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
    server()
  },
}

export default module
