import { Argv } from 'yargs'
import {
  cleanupHandler,
  hfTrimmed,
  LOG_LEVEL_STRING,
  otomi,
  OtomiDebugger,
  PrepareEnvironmentOptions,
  terminal,
} from '../common/index'
import { Arguments, helmOptions } from '../helm.opts'
import { decrypt } from './decrypt'

const fileName = 'diff'
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
}

export const diff = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<string> => {
  await setup(argv, options)
  await decrypt(argv)
  debug.verbose('Start Diff')
  const output = await hfTrimmed({
    fileOpts: argv.file,
    labelOpts: argv.label,
    logLevel: LOG_LEVEL_STRING(),
    args: ['diff', '--skip-deps'],
  })
  debug.verbose(output)
  return output
}

export const module = {
  command: fileName,
  describe: 'Diff k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    await diff(argv, { skipDecrypt: true })
  },
}

export default module
