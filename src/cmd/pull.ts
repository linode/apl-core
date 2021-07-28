import { Argv } from 'yargs'
import { $ } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { getFilename, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments as HelmArgs, helmOptions } from '../common/yargs-opts'
import { Arguments as BootsrapArgs, bootstrap } from './bootstrap'

interface Arguments extends HelmArgs, BootsrapArgs {}

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

export const _pull = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  otomi.exitIfInCore(cmdName)
  debug.info('Pull latest values')
  await $`git -C ${env.ENV_DIR} pull`
  await bootstrap(argv)
}

export const module = {
  command: cmdName,
  describe: `Wrapper for git pull && ${otomi.scriptName} bootstrap`,
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await _pull(argv, { skipKubeContextCheck: true })
  },
}

export default module
