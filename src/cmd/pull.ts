import { Argv } from 'yargs'
import { $ } from 'zx'
import { prepareEnvironment, scriptName } from '../common/cli'
import { terminal } from '../common/debug'
import { hfValues } from '../common/hf'
import { getFilename } from '../common/utils'
import { HelmArguments, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)

export const pull = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:pull`)
  const allValues = await hfValues()
  const branch = allValues!.charts?.['otomi-api']?.git?.branch ?? 'main'
  d.info('Pulling latest values')
  try {
    await $`git fetch`
    await $`if git log; then git merge origin/${branch}; fi`
  } catch (error) {
    d.error(error.stdout)
    d.warn(
      `An error occured when trying to pull (maybe not problematic).\nIf you see merge conflicts then please resolve these and run \`otomi commit\` again.`,
    )
  }
}

export const module = {
  command: cmdName,
  describe: `Wrapper for git pull && ${scriptName} bootstrap`,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await pull()
  },
}
