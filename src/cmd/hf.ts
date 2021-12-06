import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { logLevelString, OtomiDebugger, terminal } from '../common/debug'
import { hf as hfCommon } from '../common/hf'
import { getFilename } from '../common/utils'
import { HelmArguments, helmOptions, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const module = {
  command: `${cmdName} [args..]`,
  describe: undefined,
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    await hfCommon(
      {
        fileOpts: argv.file,
        labelOpts: argv.label,
        logLevel: logLevelString(),
        args: argv.args ?? [],
      },
      { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
    )
  },
}
