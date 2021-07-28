import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { hf } from '../common/hf'
import { getFilename, logLevelString, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await otomi.prepareEnvironment(options)
}

export const lint = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('Start linting')
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
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
  command: cmdName,
  describe: 'Uses helmfile lint to lint your target manifests',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await lint(argv, { skipKubeContextCheck: true })
  },
}

export default module
