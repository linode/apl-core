import { Argv } from 'yargs'
import { hf } from '../common/hf'
import { prepareEnvironment } from '../common/cli'
import { getFilename } from '../common/utils'
import { Arguments, getParsedArgs, helmOptions, setParsedArgs } from '../common/yargs-opts'
import { OtomiDebugger, terminal, logLevelString } from '../common/debug'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const lint = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  debug.info('Start linting')
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['lint', '--skip-deps'],
    },
    {
      streams: {
        stdout: debug.stream.log,
        stderr: debug.stream.error,
      },
    },
  )
}

export const module = {
  command: cmdName,
  describe: 'Uses helmfile lint to lint the target manifests',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await lint()
  },
}
