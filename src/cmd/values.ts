import { dump } from 'js-yaml'
import { Argv } from 'yargs'
import {
  BasicArguments,
  cleanupHandler,
  otomi,
  OtomiDebugger,
  PrepareEnvironmentOptions,
  terminal,
  values as hfValues,
} from '../common/index'

const fileName = 'values'
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

export const values = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.verbose('Get values')
  const hfVal = await hfValues(true)

  debug.verbose('Print values')
  console.log(dump(hfVal))
}

export const module = {
  command: fileName,
  describe: 'Show helmfile values for target cluster',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    await values(argv, { skipKubeContextCheck: true })
  },
}

export default module
