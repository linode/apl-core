import { Argv } from 'yargs'
import { $, cd, nothrow } from 'zx'
import { DEPLOYMENT_PASSWORDS_SECRET, DEPLOYMENT_STATUS_CONFIGMAP } from '../common/constants'
import { encrypt } from '../common/crypt'
import { env, isChart, isCli } from '../common/envalid'
import { hfValues } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import {
  getFilename,
  getOtomiDeploymentStatus,
  OtomiDebugger,
  setParsedArgs,
  terminal,
  waitTillAvailable,
} from '../common/utils'
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

export const gitPush = async (): Promise<boolean> => {
  const d = terminal('gitPush')
  const values = await hfValues()
  let branch = 'main'
  if (values.charts?.gitea?.enabled === false) {
    branch = values.charts!['otomi-api']!.git!.branch ?? branch
  }
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

const setDeploymentStatus = async (): Promise<void> => {
  const status = await getOtomiDeploymentStatus()
  if (status !== 'deployed') {
    await nothrow(
      $`kubectl -n ${env.DEPLOYMENT_NAMESPACE} create cm ${DEPLOYMENT_STATUS_CONFIGMAP} --from-literal=status='deployed'`,
    )
    // Since status is an indicator of successful deployment, the generated passwords must be deleted later.
    await nothrow($`kubectl delete secret ${DEPLOYMENT_PASSWORDS_SECRET}`)
  }
}

const getGiteaHealthUrl = async (): Promise<string> => {
  const healthUrl = (await $`git config --get remote.origin.url`).stdout.trim()
  debug.debug('gitea healthUrl: ', healthUrl)
  return healthUrl
}

const commitAndPush = async (): Promise<void> => {
  const d = terminal('commitAndPush')
  await $`git add -A`
  try {
    await $`git commit -m 'otomi commit' --no-verify`
  } catch (e) {
    d.info(e.stdout)
    d.error(e.stderr)
    d.log('Something went wrong trying to commit. Did you make any changes?')
  }

  // If the values are committed for the very first time then pull does not take an effect
  if (isCli) await pull()

  try {
    await $`git remote show origin`
    await gitPush()
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
  if (values.charts?.['cert-manager']?.stage === 'staging') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  }

  process.env.GIT_SSL_NO_VERIFY = 'true'

  if (values?.charts?.gitea?.enabled) {
    const url = await getGiteaHealthUrl()
    await waitTillAvailable(url)
  }
  await preCommit()
  await encrypt()
  d.info('Committing values')
  cd(env.ENV_DIR)
  await commitAndPush()
  if (isChart) await setDeploymentStatus()
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
