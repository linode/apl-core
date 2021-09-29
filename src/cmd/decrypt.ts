import { Argv } from 'yargs'
import { Arguments, decrypt } from '../common/crypt.js'
import { prepareEnvironment } from '../common/setup.js'
import { getFilename, setParsedArgs } from '../common/utils.js'

const cmdName = getFilename(import.meta.url)

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

export default module
