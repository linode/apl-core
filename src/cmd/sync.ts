import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { logLevelString, OtomiDebugger, terminal } from '../common/debug'
import { hf } from '../common/hf'
import { getFilename } from '../common/utils'
import { Arguments, getParsedArgs, helmOptions, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

const sync = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  debug.info('Start sync')
  const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['sync', '--skip-deps', skipCleanup],
    },
    { streams: { stdout: debug.stream.log } },
  )
}

export const module = {
  command: cmdName,
  describe: 'Sync all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    await sync()
  },
}
