import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { getEnvFiles, getFilename } from '../common/utils'
import { BasicArguments, setParsedArgs } from '../common/yargs-opts'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

const files = async (): Promise<void> => {
  debug.info(`Listing files in ${env.ENV_DIR}`)
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
