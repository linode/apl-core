import { copyFileSync, existsSync } from 'fs-extra'
import { Argv } from 'yargs'
import { $, cd, nothrow } from 'zx'
import { prepareEnvironment } from '../common/cli'
import { encrypt } from '../common/crypt'
import { terminal } from '../common/debug'
import { env, isCli } from '../common/envalid'
import { hfValues } from '../common/hf'
import { setDeploymentState, waitTillAvailable } from '../common/k8s'
import { getFilename, rootDir } from '../common/utils'
import { getParsedArgs, HelmArguments, setParsedArgs } from '../common/yargs'
import { Arguments as DroneArgs, genDrone } from './gen-drone'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

interface Arguments extends HelmArguments, DroneArgs {
  m?: string
  message?: string
}

export const bootstrapGit = async (inValues?: Record<string, any>): Promise<void> => {
  let values = inValues
  if (!inValues && isCli) {
    values = (await hfValues({ filesOnly: true })) as Record<string, any>
  } else return
  if (!values?.cluster?.domainSuffix) return // too early, commit will handle it
  const d = terminal(`cmd:${cmdName}:bootstrapGit`)
  const { remote, branch, email, username, password } = getRepo(values)
  cd(env.ENV_DIR)
  process.env.GIT_SSL_NO_VERIFY = '1' // we don't care about this as repo endpoint is either ours or user input
  let hasCommits = false
  try {
    d.debug('Checking out remote into /tmp/xx to test if repo exists and use if needed')
    // check remote exists by cloning with a 10 second timeout (if remote is unreachable it takes 30 secs to timeout)
    await $`set +e && rm -rf /tmp/xx >/dev/null && set -e && timeout 10 git clone ${remote} /tmp/xx`
    // it didn't throw, so we know we have an existing remote
    // do we have commits remotely?
    try {
      await $`cd /tmp/xx && git fetch && git checkout ${branch} && git log && cd -`
      d.info('We have commits, so we must clone first.')
      hasCommits = true
    } catch (e) {
      d.error(e)
      cd(env.ENV_DIR) // cd back to be nice
      if (!`${e}`.includes('would be overwritten by checkout')) {
        d.info('No commits found, We should be ok to push.')
        return
      }
    }
    // we know we have commits, so we use the clone and rsync local files if these don't exist yet
    try {
      await $`rsync -a --ignore-existing . /tmp/xx/`
      await $`rm -rf .[!.]* *  && rsync -av --no-o --no-g --no-p /tmp/xx/ ./`
    } catch (e) {
      d.warn(`An error occured when trying to sync with the clone. This is a fatal error: ${e}`)
    }
  } catch (e) {
    d.log(e)
    $.verbose = false
    d.info('Remote does not exist yet. Expecting first commit to come later.')
  }

  if (!existsSync(`${env.ENV_DIR}/.git`)) {
    d.info('Initializing values git repo.')
    await $`git init ${env.ENV_DIR}`
  }
  if (isCli) copyFileSync(`${rootDir}/bin/hooks/pre-commit`, `${env.ENV_DIR}/.git/hooks/pre-commit`)
  else await nothrow($`git config --global --add safe.directory ${env.ENV_DIR}`)
  await nothrow($`git config --local user.name ${username}`)
  await nothrow($`git config --local user.password ${password}`)
  await nothrow($`git config --local user.email ${email}`)
  if (!hasCommits) {
    await nothrow($`git checkout -b ${branch}`)
    await nothrow($`git remote add origin ${remote}`)
  }
  if (existsSync(`${env.ENV_DIR}/.sops.yaml`)) await nothrow($`git config --local diff.sopsdiffer.textconv "sops -d"`)
  d.log(`Done bootstrapping git`)
}

const gitPush = async (): Promise<boolean> => {
  const d = terminal(`cmd:${cmdName}:gitPush`)
  const values = (await hfValues()) as Record<string, any>
  let branch = 'main'
  if (values.apps?.gitea?.enabled === false) {
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

const commitAndPush = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commitAndPush`)
  d.info('Committing values')
  const argv = getParsedArgs()
  cd(env.ENV_DIR)
  try {
    await $`git add -A`
    await $`git commit -m ${argv.message || 'otomi commit'} --no-verify`
  } catch (e) {
    d.info(e.stdout)
    d.error(e.stderr)
    d.log('Something went wrong trying to commit. Did you make any changes?')
  }
  try {
    await $`git remote show origin`
    await gitPush()
    d.log('Successfully pushed the updated values')
  } catch (error) {
    d.error(error.stderr)
    throw new Error('Pushing the values failed, please read the above error message and manually try again')
  }
}

export const getRepo = (values): Record<string, any> => {
  const giteaEnabled = values?.apps?.gitea?.enabled ?? true
  const clusterDomain = values?.cluster?.domainSuffix
  const byor = !!values?.apps?.['otomi-api']?.git
  if (!giteaEnabled && !byor) {
    throw new Error('Gitea is disabled but no apps.otomi-api.git config was given.')
  }
  let username = 'Otomi Admin'
  let email: string
  let password: string
  let branch = 'main'
  let remote
  if (!giteaEnabled) {
    const otomiApiGit = values?.apps?.['otomi-api']?.git
    username = otomiApiGit?.user
    password = otomiApiGit?.password
    remote = otomiApiGit?.repoUrl
    email = otomiApiGit?.email
    branch = otomiApiGit?.branch ?? branch
  } else {
    username = 'otomi-admin'
    password = values?.apps?.gitea?.adminPassword ?? values?.otomi?.adminPassword
    email = `otomi-admin@${clusterDomain}`
    const giteaUrl = `gitea.${clusterDomain}`
    const giteaOrg = 'otomi'
    const giteaRepo = 'values'
    remote = `https://${username}:${encodeURIComponent(password)}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git`
  }
  return { remote, branch, email, username, password }
}

export const commit = async (firstTime = false): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commit`)
  await validateValues()
  d.info('Preparing values')
  const values = (await hfValues()) as Record<string, any>
  const { remote } = getRepo(values)
  await bootstrapGit(values)
  if (values?.apps!.gitea!.enabled) {
    const { adminPassword } = values.apps!.gitea
    await waitTillAvailable(remote, {
      // we wait for a 302 as that is the redirect we get to login page
      status: 302,
      skipSsl: values._derived?.untrustedCA,
      username: 'otomi-admin',
      password: adminPassword,
    })
  }
  await genDrone()
  await encrypt()
  // if (values?.apps?.gitea?.enabled) await commitAndPush()
  // else d.log('The files have been prepared, but you have to commit and push to the remote yourself.')
  await commitAndPush()

  if (firstTime) {
    await setDeploymentState({ status: 'deployed' })
    const credentials = values.apps.keycloak
    const message = `
    ########################################################################################################################################
    #
    #  To start using Otomi, go to https://otomi.${values.cluster.domainSuffix} and sign in to the web console
    #  with username "${credentials.adminUsername}" and password "${credentials.adminPassword}".
    #  Then activate Drone. For more information see: https://otomi.io/docs/installation/activation/
    #
    ########################################################################################################################################`
    d.info(message)
  }
}

export const module = {
  command: cmdName,
  describe: 'Wrapper that validates values, generates the Drone pipeline and then commits changed files',
  builder: (parser: Argv): Argv =>
    parser.options({
      message: {
        alias: ['m'],
        type: 'string',
        hidden: true,
        describe: 'Commit message',
      },
    }),
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await commit()
  },
}
