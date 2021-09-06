import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/setup'
import {
  BasicArguments,
  getFilename,
  getParsedArgs,
  OtomiDebugger,
  setParsedArgs,
  terminal,
  waitTillAvailable,
} from '../common/utils'
/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export interface Arguments extends BasicArguments {
  url: string
  skipSsl: boolean
}

export const playground = async (): Promise<void> => {
  const { url, skipSsl } = getParsedArgs() as Arguments
  debug.info(`Waiting for ${url}`)
  await waitTillAvailable(url, { retries: 0, skipSsl })
  debug.info(`${url} is available now`)
}

export const module = {
  command: `${cmdName} <url>`,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv =>
    parser.option({
      url: {
        string: true,
      },
      skipSsl: {
        boolean: true,
        default: false,
      },
      retries: {
        number: true,
        default: 10,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await playground()
  },
}

export default module
