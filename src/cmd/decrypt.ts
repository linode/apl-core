import { prepareEnvironment } from 'src/common/cli'
import { Arguments, decrypt } from 'src/common/crypt'
import { getFilename } from 'src/common/utils'
import { setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)

export const module = {
  command: `${cmdName} [files..]`,
  describe: 'Decrypts file(s), given as arguments, or any file matching secrets.*.yaml in the values repository',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipDecrypt: true, skipKubeContextCheck: true })
    await decrypt(undefined, ...(argv.files ?? []))
  },
}
