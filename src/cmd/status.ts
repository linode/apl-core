import { prepareEnvironment } from 'src/common/cli'
import { getFilename } from 'src/common/utils'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $ } from 'zx'

type Arguments = BasicArguments

const cmdName = getFilename(__filename)

const status = async (): Promise<void> => {
  const output = await $`helm list -A -a`
  console.log(output.stdout)
}

export const module = {
  command: cmdName,
  describe: 'Show cluster status',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipEnvDirCheck: true, skipDecrypt: true })
    await status()
  },
}
