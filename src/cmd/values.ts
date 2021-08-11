import { dump } from 'js-yaml'
import { Argv } from 'yargs'
import { values as valuesFunc } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const values = async (): Promise<void> => {
  debug.info('Get values')
  const hfVal = await valuesFunc({ replacePath: true })

  debug.info('Print values')
  console.log(dump(hfVal))
}

export const module = {
  command: cmdName,
  describe: 'Show helmfile values for target cluster',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await values()
  },
}

export default module
