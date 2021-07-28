import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { BasicArguments, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

const fileName = 'playground'
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: BasicArguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(options)
}

// usage:
export const example = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  debug.log(fileName)
  debug.log(argv)
  // const script = $`echo 1; sleep 1; echo 2; sleep 1; echo 3;`
  // script.stdout.pipe(debug.stream.log)
  // const out = await script
  // debug.log('Break')
  // debug.log(out.stdout.trim())
  debug.log(env)
  debug.log(process.env)

  // throw new Error('Playground error')
}

export const module = {
  command: fileName,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await example(argv, {})
  },
}

export default module
