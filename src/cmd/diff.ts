import { prepareEnvironment } from 'src/common/cli'
import { Arguments } from 'src/common/crypt'
import { logLevelString, terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { getParsedArgs, helmOptions, setParsedArgs } from 'src/common/yargs'
import { ProcessOutputTrimmed } from 'src/common/zx-enhance'
import { Argv } from 'yargs'

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
      args: ['diff'],
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
