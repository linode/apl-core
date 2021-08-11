import { Argv } from 'yargs'
import { hfStream } from '../common/hf'
import { getFilename, getParsedArgs, logLevelString, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const sync = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  debug.info('Start sync')
  const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
  await hfStream(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['sync', '--skip-deps', skipCleanup],
    },
    { trim: true, streams: { stdout: debug.stream.log } },
  )
}

export const module = {
  command: cmdName,
  describe: 'Sync all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await sync()
  },
}

export default module
