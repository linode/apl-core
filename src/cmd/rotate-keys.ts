import { Argv } from 'yargs'
import { rotate } from '../common/crypt'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const rotateKeys = async (): Promise<void> => {
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
    await prepareEnvironment({ skipDecrypt: true, skipKubeContextCheck: true })
    await rotateKeys()
  },
}

export default module
