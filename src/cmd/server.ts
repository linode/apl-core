import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { OtomiDebugger, terminal } from '../common/debug'
import { getFilename } from '../common/utils'
import { BasicArguments, setParsedArgs } from '../common/yargs'
import { startServer, stopServer } from '../server/index'

type Arguments = BasicArguments

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

const server = (): void => {
  debug.info('Starting server')
  try {
    startServer()
  } finally {
    stopServer()
  }
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
