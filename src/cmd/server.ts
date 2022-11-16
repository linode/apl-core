import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { startServer, stopServer } from 'src/server'
import { Argv } from 'yargs'

type Arguments = BasicArguments

const cmdName = getFilename(__filename)

const server = (): void => {
  const d = terminal(`cmd:${cmdName}:server`)
  d.info('Starting server')
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
