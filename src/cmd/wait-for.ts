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

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export interface Arguments extends BasicArguments {
  url: string
  skipSsl: boolean
  retries: number
}

export const waitFor = async (): Promise<void> => {
  const { url, skipSsl, retries } = getParsedArgs() as Arguments
  debug.info(`Waiting for ${url}`)
  await waitTillAvailable(url, { retries, skipSsl })
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
        default: 0,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await waitFor()
  },
}

export default module
