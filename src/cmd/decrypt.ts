import { Argv } from 'yargs'
import { decrypt as decryptFunc } from '../common/crypt'
import { OtomiDebugger, terminal } from '../common/debug'
import { BasicArguments, getFilename, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'

interface Arguments extends BasicArguments {
  files?: string[]
}
const fileName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(options)
}

export const decrypt = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('Starting decryption')
  await decryptFunc(...(argv.files ?? []))
  debug.info('Decryption is done')
}

export const module = {
  command: `${fileName} [files..]`,
  describe: 'Decrypts file(s) given as arguments in value repo, or all env/*.secrets.yaml when no arguments given',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await decrypt(argv, { skipDecrypt: true, skipKubeContextCheck: true })
  },
}

export default module
