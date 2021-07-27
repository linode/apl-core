import { Argv } from 'yargs'
import { encrypt as encryptFunc } from '../common/crypt'
import { OtomiDebugger, terminal } from '../common/debug'
import { BasicArguments, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'

interface Arguments extends BasicArguments {
  files?: string[]
}

const fileName = 'encrypt'
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

export const encrypt = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('Starting encryption')
  await encryptFunc(...(argv.files ?? []))
  debug.info('Encryption is done')
}

export const module = {
  command: `${fileName} [files..]`,
  describe: 'Encrypts file(s) given as arguments in value repo, or all env/*.secrets.yaml when no arguments given',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await encrypt(argv, { skipDecrypt: true, skipKubeContextCheck: true })
  },
}

export default module
