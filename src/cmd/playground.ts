import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { BasicArguments, getFilename, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

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

// usage:
export const _playground = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  debug.log(cmdName)
  debug.log(argv)
  // // const script = $`echo 1; sleep 1; echo 2; sleep 1; echo 3;`
  // // script.stdout.pipe(debug.stream.log)
  // // const out = await script
  // // debug.log('Break')
  // // debug.log(out.stdout.trim())
  // debug.log(env)
  // debug.log(process.env)

  // throw new Error('Playground error')
}

export const module = {
  command: cmdName,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await _playground(argv, {})
  },
}

export default module
