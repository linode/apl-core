import { Argv } from 'yargs'
import { hf } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import { getFilename, getParsedArgs, logLevelString, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
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
  describe: 'Uses helmfile lint to lint the target manifests',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await lint()
  },
}

export default module
