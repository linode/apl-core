import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { Arguments, decrypt } from '../common/crypt'
import { OtomiDebugger, terminal, logLevelString } from '../common/debug'
import { hf } from '../common/hf'
import { getFilename } from '../common/utils'
import { getParsedArgs, helmOptions, setParsedArgs } from '../common/yargs-opts'
import { ProcessOutputTrimmed } from '../common/zx-enhance'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const diff = async (): Promise<ProcessOutputTrimmed> => {
  const argv: Arguments = getParsedArgs()
  await decrypt(...(argv.files ?? []))
  debug.info('Start Diff')
  const res = await hf(
    {
      fileOpts: argv.file as string[],
      labelOpts: argv.label as string[],
      logLevel: logLevelString(),
      args: ['diff', '--skip-deps'],
    },
    { streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
  )
  return new ProcessOutputTrimmed(res)
}

export const module = {
  command: cmdName,
  describe: 'Diff all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    await diff()
  },
}
