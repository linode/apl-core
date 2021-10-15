import { dump } from 'js-yaml'
import { Argv } from 'yargs'
import { hfValues, ValuesArgs } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, getParsedArgs, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { valuesOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const values = async (): Promise<void> => {
  debug.info('Get values')
  const argv: ValuesArgs = getParsedArgs()
  const hfVal = await hfValues(argv)

  debug.info('Print values')
  console.log(dump(hfVal))
}

export const module = {
  command: cmdName,
  describe: 'Show helmfile values for target cluster (--filesOnly: only values stored on disk)',
  builder: (parser: Argv): Argv => valuesOptions(parser),

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await values()
  },
}

export default module
