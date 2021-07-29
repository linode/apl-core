import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { hfStream } from '../common/hf'
import { getFilename, logLevelString, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await otomi.prepareEnvironment(options)
}

export const sync = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
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
  // debug.info(output)
}

export const module = {
  command: cmdName,
  describe: 'Sync k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await sync(argv, {})
  },
}

export default module
