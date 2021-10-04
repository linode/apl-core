import { Argv } from 'yargs'
import { hf as hfCommon } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import { getFilename, logLevelString, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { Arguments as HelmArgs, helmOptions } from '../common/yargs-opts'

interface Arguments extends HelmArgs {
  args?: string[]
}

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const module = {
  command: `${cmdName} [args..]`,
  describe: undefined,
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
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

export default module
