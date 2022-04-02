import { prepareEnvironment } from 'common/cli'
import { logLevelString, terminal } from 'common/debug'
import { hf } from 'common/hf'
import { getFilename } from 'common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'common/yargs'
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
      args: ['lint', '--skip-deps'],
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
