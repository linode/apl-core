import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { bootstrapGit } from '../common/bootstrap'
import { prepareEnvironment } from '../common/cli'
import { encrypt } from '../common/crypt'
import { terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { setDeploymentState, waitTillAvailable } from '../common/k8s'
import { getFilename } from '../common/utils'
import { getRepo } from '../common/values'
import { getParsedArgs, HelmArguments, setParsedArgs } from '../common/yargs'
import { Arguments as DroneArgs, genDrone } from './gen-drone'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

interface Arguments extends HelmArguments, DroneArgs {
  m?: string
  message?: string
}

const gitPush = async (values: Record<string, any>): Promise<boolean> => {
  const d = terminal(`cmd:${cmdName}:gitPush`)
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

const commitAndPush = async (values: Record<string, any>): Promise<void> => {
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
    const giteaEnabled = values?.apps?.gitea?.enabled
    const byor = !!values?.apps?.['otomi-api']?.git
    if (giteaEnabled && !byor && values._derived?.untrustedCA) {
      process.env.GIT_SSL_NO_VERIFY = '1'
    }
    await $`git remote show origin`
    await gitPush(values)
    d.log('Successfully pushed the updated values')
  } catch (error) {
    d.error(error.stderr)
    throw new Error('Pushing the values failed, please read the above error message and manually try again')
  }
}

export const commit = async (firstTime = false): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commit`)
  await validateValues()
  d.info('Preparing values')
  const values = (await hfValues()) as Record<string, any>
  const { remote } = getRepo(values)
  // we call this here again, as we might not have completed (happens upon first install):
  await bootstrapGit(values)
  if (values?.apps!.gitea!.enabled) {
    const { adminPassword } = values.apps!.gitea
    await waitTillAvailable(remote, {
      status: 200,
      skipSsl: values._derived?.untrustedCA,
      username: 'otomi-admin',
      password: adminPassword,
    })
  }
  await genDrone()
  await encrypt()
  await commitAndPush(values)

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
  describe: 'Wrapper that validates values, generates the Drone pipeline and then commits and pushes changed files',
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
