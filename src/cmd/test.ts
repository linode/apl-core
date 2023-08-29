import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { hfValues } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { checkPolicies } from './check-policies'
import { lint } from './lint'
import { validateTemplates } from './validate-templates'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

const test = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:test`)
  d.log('Running tests against cluster state...')
  await validateValues()
  await lint()
  await validateTemplates()
  const values = await hfValues()
  if (!values?.apps.gatekeeper!.disableValidatingWebhook) await checkPolicies()
  d.log('Tests OK!')
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
