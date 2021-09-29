import { Argv } from 'yargs'
import { $ } from 'zx'
import { hfValues } from '../common/hf.js'
import { prepareEnvironment, scriptName } from '../common/setup.js'
import { getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils.js'
import { Arguments as HelmArgs } from '../common/yargs-opts.js'

type Arguments = HelmArgs

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const pull = async (): Promise<void> => {
  const allValues = await hfValues()
  const branch = allValues.charts?.['otomi-api']?.git?.branch ?? 'main'
  debug.info('Pulling latest values')
  try {
    await $`git fetch`
    await $`if git log; then git merge origin/${branch}; fi`
  } catch (error) {
    debug.error(error.stdout)
    debug.warn(
      `An error occured when trying to pull (maybe not problematic).\nIf you see merge conflicts then please resolve these and run \`otomi commit\` again.`,
    )
  }
}

export const module = {
  command: cmdName,
  describe: `Wrapper for git pull && ${scriptName} bootstrap`,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await pull()
  },
}

export default module
