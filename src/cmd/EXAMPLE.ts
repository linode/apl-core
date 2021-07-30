import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, setParsedArgs } from '../common/utils'

/* Steps:
 * 1. Follow all TODO in this file
 * 2. Update src/cmd/index.ts and add:
 *      `import <cmdName>Module from './<cmdName>'`
 *      `export { default as <cmdName> } from './<cmdName>'
 *      add `<cmdName>Module` to commands constant
 */

// TODO: extend this interface with the HelmArguments from '../helm.opts.ts' or add the options that you define in the `builder` at the bottom
interface Arguments extends BasicArguments {
  // TODO: Define custom options, if necessary
  TODO?: string
}

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await otomi.prepareEnvironment(options)
}

// TODO: Rename function name to filename
export const example = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  // TODO: Write your code here
  debug.log(cmdName)
  console.log(argv)
}

export const module = {
  command: cmdName,
  describe: '',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await example(argv, {}) // TODO: Replace with function name
  },
}

export default module
