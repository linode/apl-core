import { prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)

const sync = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:sync`)
  const argv: HelmArguments = getParsedArgs()
  d.info('Start sync')
  const skipCleanup = argv.skipCleanup ? '--skip-cleanup' : ''
  await hf(
    {
      fileOpts: argv.file,
      labelOpts: argv.label,
      logLevel: logLevelString(),
      args: ['sync', '--include-needs', skipCleanup],
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
