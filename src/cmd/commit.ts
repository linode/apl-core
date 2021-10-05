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
  setParsedArgs,
  terminal,
  waitTillAvailable,
} from '../common/utils'
import { isChart } from '../common/values'
import { Arguments as HelmArgs } from '../common/yargs-opts'
import { Arguments as DroneArgs, genDrone } from './gen-drone'
import { pull } from './pull'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)
let debug: OtomiDebugger

interface Arguments extends HelmArgs, DroneArgs {}

export const preCommit = async (): Promise<void> => {
  await genDrone()
}

export const gitPush = async (branch: string): Promise<boolean> => {
  const d = terminal('gitPush')
  d.info('Starting git push.')
  try {
    await $`git push -u origin ${branch}`
    d.log('Otomi values have been pushed to git.')
    return true
  } catch (e) {
    d.info(e.stdout)
    d.error(e.stderr)
    return false
  }
}

const setDeplymentStatus = async (): Promise<void> => {
  const status = await getOtomiDeploymentStatus()
  if (status !== 'deployed') {
    await nothrow($`kubectl -n ${otomiStatusNamespace} create cm ${otomiStatusCmName} --from-literal=status='deployed'`)
    // Since status is an indicator of successful deployment, the generated passwords must be deleted later.
    await nothrow($`kubectl delete secret ${otomiPasswordsSecretName}`)
  }
}

const setEnv = (values: any): void => {
  const isCertStaging = values.charts?.['cert-manager']?.stage === 'staging'
  if (isCertStaging) {
    process.env.GIT_SSL_NO_VERIFY = 'true'
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }
}
const waitForGitea = async (values: any): Promise<void> => {
  const giteaEnabled = values?.charts?.gitea?.enabled ?? true
  if (giteaEnabled && (!env.CI || isChart)) {
    const healthUrl = (await $`git config --get remote.origin.url`).stdout.trim()
    debug.debug('healthUrl: ', healthUrl)
    await waitTillAvailable(healthUrl)
  }
}

const getGitBranch = (values: any): string => {
  let branch = 'main'
  if (values.charts?.gitea?.enabled === false) {
    branch = values.charts!['otomi-api']!.git!.branch ?? branch
  }
  return branch
}

const commitAndPush = async (branch, pullBeforePush = false): Promise<void> => {
  const d = terminal('commitAndPush')
  await $`git add -A`
  try {
    await $`git commit -m 'otomi commit' --no-verify`
  } catch (e) {
    d.info(e.stdout)
    d.error(e)
    d.log('Something went wrong trying to commit. Did you make any changes?')
  }

  // If the values are committed for the very first time then pull does not take an effect
  if (pullBeforePush) await pull()

  try {
    await $`git remote show origin`
    await gitPush(branch)
    d.log('Successfully pushed the updated values')
  } catch (error) {
    d.error(error.stderr)
    throw new Error('Pushing the values failed, please read the above error message and manually try again')
  }
}

export const commit = async (): Promise<void> => {
  const d = terminal('commit')
  cd(env.ENV_DIR)
  await validateValues()
  d.info('Preparing values')
  const values = await hfValues()
  setEnv(values)
  await waitForGitea(values)
  await preCommit()
  await encrypt()
  d.info('Committing values')
  const branch = getGitBranch(values)
  const pullBeforePush = !env.CI && !isChart
  await commitAndPush(branch, pullBeforePush)
  if (!env.CI || isChart) {
    await setDeplymentStatus()
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
