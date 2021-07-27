import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { hf } from '../common/hf'
import { LOG_LEVEL_STRING, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments, helmOptions } from '../common/yargs-opts'

const fileName = 'lint'
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(options)
}

export const lint = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('Start linting')
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: LOG_LEVEL_STRING(),
      args: ['lint', '--skip-deps'],
    },
    {
      trim: true,
      streams: {
        stdout: debug.stream.log,
        stderr: debug.stream.error,
      },
    },
  )
}

export const module = {
  command: fileName,
  describe: '',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await lint(argv, { skipKubeContextCheck: true })
  },
}

export default module
