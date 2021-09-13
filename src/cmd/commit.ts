import { Argv } from 'yargs'
import { $, cd, nothrow } from 'zx'

import { encrypt } from '../common/crypt'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import {
  getFilename,
  getOtomiDeploymentStatus,
  OtomiDebugger,
  otomiStatusNamespace,
  otomiPasswordsSecretName,
  otomiStatusCmName,
  rootDir,
  setParsedArgs,
  terminal,
  waitTillAvailable,
} from '../common/utils'
import { isChart } from '../common/values'
import { Arguments as HelmArgs } from '../common/yargs-opts'
import { Arguments as DroneArgs, genDrone } from './gen-drone'
import { pull } from './pull'
import { validateValues } from './validate-values'

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

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
  const giteaEnabled = values?.charts?.gitea?.enabled ?? true
  const isCertStaging = values.charts?.['cert-manager']?.stage === 'staging'
  if (isCertStaging) {
    process.env.GIT_SSL_NO_VERIFY = 'true'
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
  cd(env.ENV_DIR)
  if (giteaEnabled && (!env.CI || isChart)) {
    const healthUrl = (await $`git config --get remote.origin.url`).stdout.trim()
    debug.debug('healthUrl: ', healthUrl)
    await waitTillAvailable(healthUrl)
  }
  preCommit()
  await encrypt()
  d.info('Committing values')
  cd(env.ENV_DIR)
  await $`git add -A`
  try {
    await $`git commit -m 'otomi commit' --no-verify`
  } catch (e) {
    d.info(e.stdout)
    d.error(e)
    d.log('Something went wrong trying to commit. Did you make any changes?')
  }

  // If the values are committed for the very first time then pull does not take an effect
  if (!env.CI) await pull()
  // previous command returned to rootDir, so go back to env:
  cd(env.ENV_DIR)
  let branch = 'main'
  if (values.charts?.gitea?.enabled === false) {
    branch = values.charts!['otomi-api']!.git!.branch ?? branch
  }

  try {
    await $`git remote show origin`
    await gitPush(branch)
    d.log('Successfully pushed the updated values')
  } catch (error) {
    d.error(error.stderr)
    throw new Error('Pushing the values failed, please read the above error message and manually try again')
  } finally {
    cd(rootDir)
  }
  if (!env.CI || isChart) {
    const status = await getOtomiDeploymentStatus()
    if (status !== 'deployed') {
      await nothrow(
        $`kubectl -n ${otomiStatusNamespace} create cm ${otomiStatusCmName} --from-literal=status='deployed'`,
      )
      // Since status is an indicator of successful deployment, the generated passwords must be deleted later.
      await nothrow($`kubectl delete secret ${otomiPasswordsSecretName}`)
    }
  }
}

export const module = {
  command: cmdName,
  describe: 'Execute wrapper for generate pipelines -> git commit changed files',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    debug = terminal(cmdName)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await commit()
  },
}

export default module
