import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { getEnvFiles, getFilename } from 'src/common/utils'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)

const files = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:files`)
  d.info(`Listing files in ${env.ENV_DIR}`)
  const list = await getEnvFiles()
  console.log(list.join('\n'))
}

export const module = {
  command: cmdName,
  describe: `Show files in ${env.ENV_DIR}`,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await files()
  },
}
