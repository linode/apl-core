import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { prepareEnvironment, scriptName } from '../common/cli'
import { terminal } from '../common/debug'
import { env, isCli } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getFilename } from '../common/utils'
import { HelmArguments, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)

export const pull = async (remote = undefined): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:pull`)
  const allValues = await hfValues()
  const branch = allValues?.apps?.['otomi-api']?.git?.branch ?? 'main'
  d.info('Pulling latest values')
  cd(env.ENV_DIR)
  try {
    await $`git fetch`
    await $`if git log; then git merge origin/${branch}; fi`
  } catch (error) {
    if (!remote || error.stderr.includes('conflict')) {
      d.warn(
        `An error occured when trying to pull (maybe not problematic).\nIf you see merge conflicts then please resolve these and run \`otomi commit\` again.`,
      )
      return
    }
    try {
      d.debug('Removing empty .git folder and checking out remote')
      await $`mv .git /tmp/x && rm -rf .git && git clone ${remote} /tmp/xx && mv /tmp/xx/.git . && git checkout ${branch} && git pull`
    } catch (e) {
      if (`${e}`.includes('You appear to have cloned an empty repository')) {
        await $`rm -rf .git && mv /tmp/x .git && rm -rf /tmp/xx /tmp/x`
        return
      }
      d.error(e)
      throw new Error(`An error occured when trying to clone the remote ${remote}. This is a fatal error: ${e}`)
    }
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
