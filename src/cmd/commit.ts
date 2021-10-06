import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { encrypt } from '../common/crypt'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import { getFilename, rootDir, setParsedArgs, terminal } from '../common/utils'
import { isChart } from '../common/values'
import { Arguments as HelmArgs } from '../common/yargs-opts'
import { Arguments as DroneArgs, genDrone } from './gen-drone'
import { pull } from './pull'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

interface Arguments extends HelmArgs, DroneArgs {}

export const preCommit = async (): Promise<void> => {
  await genDrone()
}

export const gitPush = async (branch: string): Promise<boolean> => {
  const d = terminal('gitPush')
  d.info('Starting git push.')

  cd(env.ENV_DIR)
  try {
    await $`git push -u origin ${branch}`
    d.log('Otomi values have been pushed to git.')
    return true
  } catch (e) {
    d.info(e.stdout)
    d.error(e.stderr)
    return false
  } finally {
    cd(rootDir)
  }
}

export const commit = async (): Promise<void> => {
  const d = terminal('commit')
  await validateValues()
  d.info('Preparing values')
  const values = await hfValues()
  cd(env.ENV_DIR)
  await preCommit()
  await encrypt()
  d.info('Committing values')
  cd(env.ENV_DIR)
  await $`git add -A`
  try {
    await $`git commit -m 'otomi commit' --no-verify`
  } catch (e) {
    d.info(e.stdout)
    d.error(e.stderr)
    d.log('Something went wrong trying to commit. Did you make any changes?')
  }

  if (!env.CI && !isChart) await pull()
  // previous command returned to rootDir, so go back to env:
  cd(env.ENV_DIR)
  let branch = 'main'
  if (values.charts?.gitea?.enabled === false) {
    branch = values.charts!['otomi-api']!.git!.branch ?? branch
  }

  try {
    const isCertStaging = values.charts?.['cert-manager']?.stage === 'staging'
    if (isCertStaging) {
      process.env.GIT_SSL_NO_VERIFY = 'true'
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }
    await $`git remote show origin`
    await gitPush(branch)
    d.log('Successfully pushed the updated values')
  } catch (error) {
    d.error(error.stderr)
    throw new Error('Pushing the values failed, please read the above error message and manually try again')
  } finally {
    cd(rootDir)
  }
}

export const module = {
  command: cmdName,
  describe: 'Execute wrapper for generate pipelines -> git commit changed files',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await commit()
  },
}

export default module
