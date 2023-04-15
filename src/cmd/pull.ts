import { prepareEnvironment, scriptName } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { hfValues } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { HelmArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $, cd } from 'zx'

const cmdName = getFilename(__filename)

export const pull = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:pull`)
  const allValues = await hfValues()
  const branch = allValues?.apps?.['otomi-api']?.git?.branch ?? 'main'
  d.info('Pulling latest values')
  cd(env.ENV_DIR)
  try {
    await $`git fetch`
    await $`if git --no-pager log --decorate=short --pretty=oneline -n1; then git merge origin/${branch}; fi`
  } catch (error) {
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
