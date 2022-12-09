import { prepareEnvironment } from 'src/common/cli'
import { DebugStream, logLevelString } from 'src/common/debug'
import { hf as hfCommon } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)
interface Arguments extends HelmArguments {
  skipK8s?: boolean
}

export const module = {
  command: `${cmdName} [args..]`,
  describe: undefined,
  builder: (parser: Argv): Argv =>
    helmOptions(
      parser.options({
        skipK8s: {
          boolean: true,
          default: false,
          describe: 'When set it skips kubecontext check',
        },
      }),
    ),
  handler: async (argv: Arguments): Promise<void> => {
    // const d = terminal(`cmd:${cmdName}`)
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: argv.skipK8s })
    await hfCommon(
      {
        fileOpts: argv.file,
        labelOpts: argv.label,
        logLevel: logLevelString(),
        args: argv.args ?? [],
      },
      {
        streams: {
          stdout: new DebugStream(console.log),
          stderr: new DebugStream(console.error),
        },
      },
    )
  },
}
