import { Argv } from 'yargs'
import { Arguments, encrypt as encryptFunc } from '../common/crypt'
import { prepareEnvironment } from '../common/cli'
import { getFilename } from '../common/utils'
import { OtomiDebugger, terminal } from '../common/debug'
import { getParsedArgs, setParsedArgs } from '../common/yargs-opts'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

const encrypt = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  debug.info('otomi encrypt')
  await encryptFunc(...(argv.files ?? []))
}

export const module = {
  command: `${cmdName} [files..]`,
  describe: 'Encrypts file(s), given as arguments, or any file matching secrets.*.yaml in the values repository',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipDecrypt: true, skipKubeContextCheck: true })
    await encrypt()
  },
}
