import { Argv } from 'yargs'
import { encrypt as encryptFunc } from '../common/crypt'
import { cleanupHandler, prepareEnvironment, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'

interface Arguments extends BasicArguments {
  files?: string[]
}

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

  if (options) await prepareEnvironment(options)
}

export const encrypt = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('otomi encrypt')
  await encryptFunc(...(argv.files ?? []))
}

export const module = {
  command: `${cmdName} [files..]`,
  describe: 'Encrypts file(s), given as arguments, or any file matching secrets.*.yaml in the values repository',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await encrypt(argv, { skipDecrypt: true, skipKubeContextCheck: true })
  },
}

export default module
