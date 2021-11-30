import { Argv } from 'yargs'
import { $ } from 'zx'
import { prepareEnvironment } from '../common/cli'
import { getFilename } from '../common/utils'
import { BasicArguments, setParsedArgs } from '../common/yargs-opts'

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
