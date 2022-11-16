import { prepareEnvironment } from 'src/common/cli'
import { Arguments, encrypt as encryptFunc } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { getParsedArgs, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)

const encrypt = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:encrypt`)
  const argv: Arguments = getParsedArgs()
  d.info('otomi encrypt')
  await encryptFunc(undefined, ...(argv.files ?? []))
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
