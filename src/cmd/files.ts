import { Argv } from 'yargs'
import { env } from '../common/envalid'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getEnvFiles, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const files = async (): Promise<void> => {
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

export default module
