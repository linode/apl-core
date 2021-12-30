import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { hfValues } from '../common/hf'
import { getFilename } from '../common/utils'
import { HelmArguments, helmOptions, setParsedArgs } from '../common/yargs'
import { checkPolicies } from './check-policies'
import { lint } from './lint'
import { validateTemplates } from './validate-templates'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

const test = async (): Promise<void> => {
  await validateValues()
  await lint()
  await validateTemplates()
  const values = await hfValues()
  if (!values!.charts['gatekeeper-operator']!.disableValidatingWebhook) await checkPolicies()
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
