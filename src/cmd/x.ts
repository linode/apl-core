import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, logLevel, logLevels, setParsedArgs } from '../common/utils'
import { stream } from '../common/zx-enhance'

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

export const x = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<number> => {
  await setup(argv, options)
  const commands = argv._.slice(1)
  if (logLevel() >= logLevels.INFO) commands.push('-v')
  const output = await stream(nothrow($`${commands}`), { stdout: debug.stream.log, stderr: debug.stream.error })
  return output.exitCode
}

export const module = {
  command: cmdName,
  describe: 'Execute command in container',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    const exitCode = await x(argv, { skipKubeContextCheck: true })
    process.exit(exitCode)
  },
}

export default module
