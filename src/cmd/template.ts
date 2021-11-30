import { Argv } from 'yargs'
import { hfTemplate } from '../common/hf'
import { prepareEnvironment } from '../common/cli'
import { getFilename } from '../common/utils'
import { Arguments as HelmArgs, getParsedArgs, helmOptions, setParsedArgs } from '../common/yargs-opts'
import { OtomiDebugger, terminal } from '../common/debug'

interface Arguments extends HelmArgs {
  outDir: string
}

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

const template = async (): Promise<void> => {
  const argv = getParsedArgs() as Arguments
  debug.info('Templating STARTED')
  await hfTemplate(argv, argv.outDir, { stdout: debug.stream.log, stderr: debug.stream.error })
  debug.info('Templating DONE')
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
