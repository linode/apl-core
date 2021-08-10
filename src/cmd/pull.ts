import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { cleanupHandler, prepareEnvironment, PrepareEnvironmentOptions, scriptName } from '../common/setup'
import { currDir, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { Arguments as HelmArgs } from '../common/yargs-opts'
import { bootstrapValues } from './bootstrap'

type Arguments = HelmArgs

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await prepareEnvironment(options)
}

export const pull = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  const allValues = await hfValues()
  const branch = allValues.charts?.['otomi-api']?.git?.branch ?? 'main'
  debug.info('Pulling latest values')
  const cwd = await currDir()
  cd(env.ENV_DIR)
  try {
    await $`git fetch`
    await $`git merge origin/${branch}`
  } catch (error) {
    debug.error(`Merge conflicts occured when trying to pull.\nPlease resolve these and run \`otomi commit\` again.`)
    process.exit(env.CI ? 0 : 1)
  } finally {
    cd(cwd)
  }

  await bootstrapValues(argv)
}

export const module = {
  command: cmdName,
  describe: `Wrapper for git pull && ${scriptName} bootstrap`,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await pull(argv, { skipKubeContextCheck: true })
  },
}

export default module
