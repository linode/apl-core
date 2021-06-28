import { Argv } from 'yargs'
import {
  BasicArguments,
  cleanupHandler,
  otomi,
  OtomiDebugger,
  PrepareEnvironmentOptions,
  terminal,
} from '../common/index'

/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

const fileName = 'playground'
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: BasicArguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
}

export const example = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  debug.log(fileName)
  debug.log(argv)
  throw new Error('Playground error')
}

export const module = {
  command: fileName,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    await example(argv, {})
  },
}

export default module
