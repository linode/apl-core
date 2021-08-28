import { Argv } from 'yargs'
import { Arguments, decrypt } from '../common/crypt'
import { hfStream } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import { getFilename, getParsedArgs, logLevelString, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { helmOptions } from '../common/yargs-opts'
import { ProcessOutputTrimmed } from '../common/zx-enhance'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const diff = async (): Promise<ProcessOutputTrimmed> => {
  const argv: Arguments = getParsedArgs()
  await decrypt(...(argv.files ?? []))
  debug.info('Start Diff')
  const res = await hfStream(
    {
      fileOpts: argv.file as string[],
      labelOpts: argv.label as string[],
      logLevel: logLevelString(),
      args: ['diff', '--skip-deps'],
    },
    { trim: true, streams: { stdout: debug.stream.log, stderr: debug.stream.error } },
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

export default module
