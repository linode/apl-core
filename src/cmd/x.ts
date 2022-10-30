import { prepareEnvironment } from 'src/common/cli'
import { OtomiDebugger, terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { BasicArguments, getParsedArgs, setParsedArgs } from 'src/common/yargs'
import { stream } from 'src/common/zx-enhance'
import { Arguments, Argv } from 'yargs'
import { $, nothrow } from 'zx'

const cmdName = getFilename(__filename)
const d: OtomiDebugger = terminal(`cmd:${cmdName}`)

export const x = async (inArgv?: Arguments): Promise<number> => {
  const argv: Arguments = inArgv ?? getParsedArgs()
  const commands = argv._.slice(1)
  const output = await stream(nothrow($`${commands}`), { stdout: d.stream.log, stderr: d.stream.error })
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
