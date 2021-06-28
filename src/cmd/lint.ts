import { Argv } from 'yargs'
import {
  cleanupHandler,
  hf,
  LOG_LEVEL_STRING,
  otomi,
  OtomiDebugger,
  PrepareEnvironmentOptions,
  terminal,
} from '../common/index'
import { Arguments, helmOptions } from '../helm.opts'

const fileName = 'lint'
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

export const lint = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.verbose('Start linting')
  const output = await hf({
    fileOpts: argv.file,
    labelOpts: argv.label,
    logLevel: LOG_LEVEL_STRING(),
    args: ['lint', '--skip-deps'],
  })
  debug.verbose(output)
}

export const module = {
  command: fileName,
  describe: '',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    await lint(argv, { skipKubeContextCheck: true })
  },
}

export default module
