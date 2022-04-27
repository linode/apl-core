import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { DebugStream, terminal } from '../common/debug'
import { hfTemplate } from '../common/hf'
import { getFilename } from '../common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from '../common/yargs'

interface Arguments extends HelmArguments {
  outDir: string
}

const cmdName = getFilename(__filename)

const template = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:template`)
  const argv = getParsedArgs() as Arguments
  d.info('Templating STARTED')
  if (argv.nonInteractive) await hfTemplate(argv, argv.outDir, { stdout: d.stream.log, stderr: d.stream.error })
  else
    await hfTemplate(argv, argv.outDir, {
      stdout: new DebugStream(console.log),
      stderr: new DebugStream(console.error),
    })
  d.info('Templating DONE')
}

export const module = {
  command: `${cmdName} [outDir]`,
  describe: 'Export all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await template()
  },
}
