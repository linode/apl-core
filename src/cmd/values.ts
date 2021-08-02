import { dump } from 'js-yaml'
import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { values as valuesFunc } from '../common/hf'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, setParsedArgs } from '../common/utils'

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: BasicArguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await otomi.prepareEnvironment(options)
}

export const values = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
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
    await values(argv, { skipKubeContextCheck: true })
  },
}

export default module
