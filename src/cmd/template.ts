import { prepareEnvironment } from 'src/common/cli'
import { DebugStream, terminal } from 'src/common/debug'
import { hfTemplate } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { HelmArguments, getParsedArgs, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

interface Arguments extends HelmArguments {
  outDir: string
}

const cmdName = getFilename(__filename)

const template = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:template`)
  const argv = getParsedArgs() as Arguments
  d.info('# Templating STARTED')
  await hfTemplate(argv, argv.outDir, {
    stdout: new DebugStream(console.log),
    stderr: new DebugStream(console.error),
  })
  d.info('# Templating DONE')
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
