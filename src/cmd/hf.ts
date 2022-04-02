import { prepareEnvironment } from 'common/cli'
import { logLevelString, terminal } from 'common/debug'
import { hf as hfCommon } from 'common/hf'
import { getFilename } from 'common/utils'
import { HelmArguments, helmOptions, setParsedArgs } from 'common/yargs'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)

export const module = {
  command: `${cmdName} [args..]`,
  describe: undefined,
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    const d = terminal(`cmd:${cmdName}`)
    setParsedArgs(argv)
    await prepareEnvironment()
    await hfCommon(
      {
        fileOpts: argv.file,
        labelOpts: argv.label,
        logLevel: logLevelString(),
        args: argv.args ?? [],
      },
      { streams: { stdout: d.stream.log, stderr: d.stream.error } },
    )
  },
}
