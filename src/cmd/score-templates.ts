import { existsSync, unlinkSync } from 'fs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { hfTemplate } from '../common/hf'
import { cleanupHandler, prepareEnvironment, PrepareEnvironmentOptions } from '../common/setup'
import { getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
const templatePath = '/tmp/template.yaml'
let debug: OtomiDebugger

/*
Note: Colors do not work: https://github.com/google/zx/issues/124
*/
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  if (existsSync(templatePath)) unlinkSync(templatePath)
}

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await prepareEnvironment(options)
}

export const scoreTemplate = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
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
    await scoreTemplate(argv, { skipKubeContextCheck: true })
  },
}

export default module
