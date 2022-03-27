import { copyFileSync, existsSync } from 'fs'
import { Argv } from 'yargs'
import { $, cd, nothrow } from 'zx'
import { prepareEnvironment } from '../common/cli'
import { DEPLOYMENT_PASSWORDS_SECRET, DEPLOYMENT_STATUS_CONFIGMAP } from '../common/constants'
import { encrypt } from '../common/crypt'
import { terminal } from '../common/debug'
import { env, isChart, isCli } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getOtomiDeploymentStatus, waitTillAvailable } from '../common/k8s'
import { getFilename, rootDir } from '../common/utils'
import { HelmArguments, setParsedArgs } from '../common/yargs'
import { Arguments as DroneArgs, genDrone } from './gen-drone'
import { pull } from './pull'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

interface Arguments extends HelmArguments, DroneArgs {}

const gitPush = async (): Promise<boolean> => {
  const d = terminal(`cmd:${cmdName}:gitPush`)
  const values = await hfValues()
  let branch = 'main'
  if (values?.apps?.gitea?.enabled === false) {
    branch = values.apps!['otomi-api']!.git!.branch ?? branch
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

export const setDeploymentStatus = async (): Promise<void> => {
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
  const d = terminal(`cmd:${cmdName}:getGiteaHealthUrl`)
  const healthUrl = (await $`git -C ${env.ENV_DIR} config --get remote.origin.url`).stdout.trim()
  d.debug('gitea healthUrl: ', healthUrl)
  return healthUrl
}

const commitAndPush = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commitAndPush`)
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

const bootstrapGit = async (values): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:bootstrapGit`)
  d.info('Initializing values git repo.')
  await $`git init ${env.ENV_DIR}`
  copyFileSync(`${rootDir}/bin/hooks/pre-commit`, `${env.ENV_DIR}/.git/hooks/pre-commit`)

  const giteaEnabled = values?.apps?.gitea?.enabled ?? true
  const clusterDomain = values?.cluster?.domainSuffix
  const byor = !!values?.apps?.['otomi-api']?.git

  if (!giteaEnabled && !byor) {
    throw new Error('Gitea is disabled but no apps.otomi-api.git config was given.')
  }
  let username = 'Otomi Admin'
  let email: string
  let password: string
  let remote: string
  const branch = 'main'
  if (!giteaEnabled) {
    const otomiApiGit = values?.apps?.['otomi-api']?.git
    username = otomiApiGit?.user
    password = otomiApiGit?.password
    remote = otomiApiGit?.repoUrl
    email = otomiApiGit?.email
  } else {
    username = 'otomi-admin'
    password = values?.apps?.gitea?.adminPassword ?? values?.otomi?.adminPassword
    email = `otomi-admin@${clusterDomain}`
    const giteaUrl = `gitea.${clusterDomain}`
    const giteaOrg = 'otomi'
    const giteaRepo = 'values'
    remote = `https://${username}:${encodeURIComponent(password)}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git`
  }

  await $`git -C ${env.ENV_DIR} config --local user.name ${username}`
  await $`git -C ${env.ENV_DIR} config --local user.password ${password}`
  await $`git -C ${env.ENV_DIR} config --local user.email ${email}`
  await $`git -C ${env.ENV_DIR} checkout -b ${branch}`
  await $`git -C ${env.ENV_DIR} remote add origin ${remote}`
  if (existsSync(`${env.ENV_DIR}/.sops.yaml`))
    await nothrow($`git -C ${env.ENV_DIR} config --local diff.sopsdiffer.textconv "sops -d"`)

  d.log(`Done bootstrapping git`)
}

const preCommit = async (): Promise<void> => {
  await genDrone()
  await encrypt()
}

export const commit = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commit`)
  await validateValues()
  d.info('Preparing values')
  const values = await hfValues()
  if (values?._derived?.untrustedCA) {
    process.env.GIT_SSL_NO_VERIFY = 'true'
  }
  if (!existsSync(`${env.ENV_DIR}/.git`)) await bootstrapGit(values)

  if (values!.apps!.gitea!.enabled) {
    const url = await getGiteaHealthUrl()
    const { adminPassword } = values!.apps!.gitea
    await waitTillAvailable(url, {
      // we wait for a 404 as that is the best we can do,
      // since that is what gitea gives for repos that have nothing public
      status: 404,
      skipSsl: values?._derived?.untrustedCA,
      username: 'otomi-admin',
      password: adminPassword,
    })
  }
  await preCommit()
  if (values?.apps?.gitea?.enabled) await commitAndPush()
  else d.log('The files have been prepared, but you have to commit and push to the remote yourself.')

  if (isChart) {
    await setDeploymentStatus()
    const credentials = values!.apps.keycloak
    const message = `
    ########################################################################################################################################
    #
    #  To start using Otomi, go to https://otomi.${values!.cluster.domainSuffix} and sign in to the web console
    #  as: '${credentials.adminUsername}' and password:  ${credentials.adminPassword}
    #  Then activate Drone. For more information see: https://otomi.io/docs/installation/post-install/
    #
    ########################################################################################################################################`
    d.info(message)
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
