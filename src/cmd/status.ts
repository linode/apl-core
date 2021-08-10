import { Argv } from 'yargs'
import { $ } from 'zx'
import { BasicArguments, getFilename, setParsedArgs } from '../common/utils'

type Arguments = BasicArguments

const cmdName = getFilename(import.meta.url)

export const status = async (): Promise<void> => {
  const output = await $`helm list -A -a`
  console.log(output.stdout)
}

export const module = {
  command: cmdName,
  describe: 'Show cluster status',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await status()
  },
}

export default module
