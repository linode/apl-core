import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { hf as hfFunc } from '../common/hf'
import { LOG_LEVEL_STRING } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments as HelmArgs, helmOptions } from '../helm.opts'

interface Arguments extends HelmArgs {
  args?: string[]
}

const fileName = 'hf'
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

export const hf = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  try {
    const output = await hfFunc({
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: LOG_LEVEL_STRING(),
      args: argv.args ?? [],
    })
    debug.log(output)
  } catch (error) {
    debug.exit(1, error)
  }
}

export const module = {
  command: `${fileName} [args..]`,
  describe: '',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    await hf(argv, {})
  },
}

export default module
