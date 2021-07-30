import { Argv } from 'yargs'
import { $ } from 'zx'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, setParsedArgs } from '../common/utils'

type Arguments = BasicArguments

const cmdName = getFilename(import.meta.url)

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))

  if (options) await otomi.prepareEnvironment(options)
}

export const status = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  const output = await $`helm list -A -a`
  console.log(output.stdout)
}

export const module = {
  command: cmdName,
  describe: 'Show cluster status',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await status(argv, {})
  },
}

export default module
