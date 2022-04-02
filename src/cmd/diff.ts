import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { Arguments } from '../common/crypt'
import { logLevelString, terminal } from '../common/debug'
import { hf } from '../common/hf'
import { getFilename } from '../common/utils'
import { getParsedArgs, helmOptions, setParsedArgs } from '../common/yargs'
import { ProcessOutputTrimmed } from '../common/zx-enhance'

const cmdName = getFilename(__filename)

export const diff = async (): Promise<ProcessOutputTrimmed> => {
  const d = terminal(`cmd:${cmdName}:diff`)
  const argv: Arguments = getParsedArgs()
  d.info('Start Diff')
  const res = await hf(
    {
      fileOpts: argv.file as string[],
      labelOpts: argv.label as string[],
      logLevel: logLevelString(),
      args: ['diff', '--skip-deps'],
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
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
