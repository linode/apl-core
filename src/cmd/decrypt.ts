import { Argv } from 'yargs'
import { decrypt as decryptFunc } from '../common/crypt'
import { OtomiDebugger, terminal } from '../common/debug'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, setParsedArgs } from '../common/utils'

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

  if (options) await otomi.prepareEnvironment({ ...options, skipDecrypt: true })
}

export const decrypt = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('otomi decrypt')
  await decryptFunc(...(argv.files ?? []))
}

export const module = {
  command: `${cmdName} [files..]`,
  describe: 'Decrypts file(s) given as arguments in value repo, or all env/*.secrets.yaml when no arguments given',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await decrypt(argv, { skipDecrypt: true, skipKubeContextCheck: true })
  },
}

export default module
