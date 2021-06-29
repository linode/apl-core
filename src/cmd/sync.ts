import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { Arguments, helmOptions } from '../common/helm-opts'
import { hfTrimmed } from '../common/hf'
import { LOG_LEVEL_STRING } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { decrypt } from './decrypt'

const fileName = 'sync'
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
}

export const sync = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  await decrypt(argv)
  debug.verbose('Start sync')
  const skipCleanup = argv['skip-cleanup'] ? '--skip-cleanup' : ''
  const output = await hfTrimmed({
    fileOpts: argv.file,
    labelOpts: argv.label,
    logLevel: LOG_LEVEL_STRING(),
    args: ['sync', '--skip-deps', skipCleanup],
  })
  debug.verbose(output)
}

export const module = {
  command: fileName,
  describe: 'Sync k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    await sync(argv, {})
  },
}

export default module
