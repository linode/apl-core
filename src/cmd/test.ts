import { existsSync, unlinkSync } from 'fs'
import { Argv } from 'yargs'
import { cleanupHandler, prepareEnvironment } from '../common/cli'
import { getFilename } from '../common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from '../common/yargs'
import { lint } from './lint'
import { validateTemplates } from './validate-templates'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)
const tmpFile = '/tmp/otomi/test.yaml'

const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  if (existsSync(tmpFile)) unlinkSync(tmpFile)
}

const setup = (argv: HelmArguments): void => {
  cleanupHandler(() => cleanup(argv))
}

const test = async (): Promise<void> => {
  setup(getParsedArgs())
  await validateValues()
  await lint()
  await validateTemplates()
  // await checkPolicies()
}

export const module = {
  command: cmdName,
  describe: 'Run tests against the target cluster',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await test()
  },
}
