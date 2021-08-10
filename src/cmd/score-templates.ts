import { existsSync, unlinkSync } from 'fs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { hfTemplate } from '../common/hf'
import { cleanupHandler, prepareEnvironment } from '../common/setup'
import { getFilename, getParsedArgs, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
const templatePath = '/tmp/template.yaml'
const debug: OtomiDebugger = terminal(cmdName)

const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  if (existsSync(templatePath)) unlinkSync(templatePath)
}

const setup = async (argv: Arguments): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
}

export const scoreTemplate = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  debug.info('Scoring STARTED')
  await hfTemplate(argv, templatePath)
  debug.info('Scoring DONE')

  const scoreResult = await nothrow($`kube-score score ${templatePath}`)
  debug.log(scoreResult.stdout.trim())
}

export const module = {
  command: cmdName,
  describe: undefined,
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    setup(argv)
    await scoreTemplate()
  },
}

export default module
