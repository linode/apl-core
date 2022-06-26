import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { logLevelString, terminal } from '../common/debug'
import { hf } from '../common/hf'
import { getFilename } from '../common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)

const sync = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:sync`)
  const argv: HelmArguments = getParsedArgs()
  d.info('Start sync')
  // const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      // args: ['sync', skipCleanup],
      args: ['sync'],
    },
    { streams: { stdout: d.stream.log } },
  )
}

export const module = {
  command: cmdName,
  describe: 'Sync all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    await sync()
  },
}
