import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfStream } from '../common/hf'
import { getFilename, logLevelString, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments as HelmArgs, helmOptions } from '../common/yargs-opts'

interface Arguments extends HelmArgs {
  args?: string[]
}

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

export const hf = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  try {
    await hfStream(
      {
        fileOpts: argv.file,
        labelOpts: argv.label,
        logLevel: logLevelString(),
        args: argv.args ?? [],
      },
      { trim: true, streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
    )
  } catch (error) {
    debug.error(error.stderr)
    process.exit(1)
  }
}

export const module = {
  command: `${cmdName} [args..]`,
  describe: undefined,
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await hf(argv, { skipKubeContextCheck: env.TESTING })
  },
}

export default module
