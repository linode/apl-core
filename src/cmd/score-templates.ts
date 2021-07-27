import { unlinkSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { hfTemplate } from '../common/hf'
import { setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments, helmOptions } from '../common/yargs-opts'

const fileName = 'score-template'
const templatePath = '/tmp/template.yaml'
let debug: OtomiDebugger

/*
Note: Colors do not work: https://github.com/google/zx/issues/124
*/
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  unlinkSync(templatePath)
}

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(options)
}

export const scoreTemplate = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('Scoring STARTED')
  const result = await hfTemplate(argv)
  debug.info('Scoring DONE')

  writeFileSync(templatePath, result)

  const scoreResult = await nothrow($`kube-score score ${templatePath}`)
  debug.log(scoreResult.stdout.trim())
}

export const module = {
  command: fileName,
  describe: '',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await scoreTemplate(argv, { skipKubeContextCheck: true })
  },
}

export default module
