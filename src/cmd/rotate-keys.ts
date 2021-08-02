import { Argv } from 'yargs'
import { rotate } from '../common/crypt'
import { OtomiDebugger, terminal } from '../common/debug'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, setParsedArgs } from '../common/utils'

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: BasicArguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await otomi.prepareEnvironment(options)
}

export const rotateKeys = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('Starting key rotation')
  await rotate()
  debug.info('Key rotation is done')
}

export const module = {
  command: cmdName,
  describe: 'Rotate keys for all the sops secrets in the values repository',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await rotateKeys(argv, { skipDecrypt: true, skipKubeContextCheck: true })
  },
}

export default module
