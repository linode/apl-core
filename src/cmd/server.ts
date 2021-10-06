import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { startServer } from '../server/index'

type Arguments = BasicArguments

const cmdName = getFilename(__filename)
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
