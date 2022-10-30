import { prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)

export const lint = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:lint`)
  const argv: HelmArguments = getParsedArgs()
  d.info('Start linting')
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['lint'],
    },
    {
      streams: {
        stdout: d.stream.log,
        stderr: d.stream.error,
      },
    },
  )
}

export const module = {
  command: cmdName,
  describe: 'Uses helmfile lint to lint the target manifests',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await lint()
  },
}
