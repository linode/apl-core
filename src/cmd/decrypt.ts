import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { Arguments, decrypt } from '../common/crypt'
import { getFilename } from '../common/utils'
import { setParsedArgs } from '../common/yargs-opts'

const cmdName = getFilename(__filename)

export const module = {
  command: `${cmdName} [files..]`,
  describe: 'Decrypts file(s), given as arguments, or any file matching secrets.*.yaml in the values repository',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipDecrypt: true, skipKubeContextCheck: true })
    await decrypt(...(argv.files ?? []))
  },
}
