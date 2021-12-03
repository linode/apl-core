import { Arguments, Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { prepareEnvironment } from '../common/cli'
import { OtomiDebugger, terminal } from '../common/debug'
import { getFilename } from '../common/utils'
import { BasicArguments, getParsedArgs, setParsedArgs } from '../common/yargs'
import { stream } from '../common/zx-enhance'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const x = async (inArgv?: Arguments): Promise<number> => {
  const argv: Arguments = inArgv ?? getParsedArgs()
  const commands = argv._.slice(1)
  const output = await stream(nothrow($`${commands}`), { stdout: debug.stream.log, stderr: debug.stream.error })
  return output.exitCode
}

export const module = {
  command: `${cmdName}`,
  describe: 'Execute command in container',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    const exitCode = await x()
    process.exit(exitCode)
  },
}
