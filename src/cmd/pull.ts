import { Argv } from 'yargs'
import { $ } from 'zx'
import { cleanupHandler, ENV, otomi, OtomiDebugger, PrepareEnvironmentOptions, terminal } from '../common/index'
import { Arguments as HelmArgs, helmOptions } from '../helm.opts'
import { Arguments as BootsrapArgs, bootstrap } from './bootstrap'

interface Arguments extends HelmArgs, BootsrapArgs {}

const fileName = 'pull'
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

export const pull = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  otomi.closeIfInCore(fileName, debug)
  await $`git -C ${ENV.DIR} pull`
  await bootstrap(argv)
}

export const module = {
  command: fileName,
  describe: `Wrapper for git pull && ${otomi.scriptName} bootstrap`,
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    await pull(argv, { skipKubeContextCheck: true })
  },
}

export default module
