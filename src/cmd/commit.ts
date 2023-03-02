import { bootstrapGit } from 'src/common/bootstrap'
import { prepareEnvironment } from 'src/common/cli'
import { encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { env, isCi } from 'src/common/envalid'
import { hfValues } from 'src/common/hf'
import { setDeploymentState, waitTillAvailable } from 'src/common/k8s'
import { getFilename } from 'src/common/utils'
import { getRepo } from 'src/common/values'
import { getParsedArgs, HelmArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $, cd } from 'zx'
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
  const message = isCi ? 'updated values [ci skip]' : argv.message || 'otomi commit'
  cd(env.ENV_DIR)
  try {
    await $`git add -A`
    await $`git commit -m ${message} --no-verify`
  } catch (e) {
    d.log('Could not commit. Did you make any changes?')
    return
  }
  try {
    const giteaEnabled = values?.apps?.gitea?.enabled
    const byor = !!values?.apps?.['otomi-api']?.git
    if (giteaEnabled && !byor && values._derived?.untrustedCA) {
      process.env.GIT_SSL_NO_VERIFY = '1'
    }
    await $`git remote show origin`
    if (await gitPush(values)) {
      d.log('Successfully pushed the updated values')
    }
  } catch (error) {
    d.error(error.stderr)
    throw new Error('Origin does not exist yet')
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
  await setDeploymentState({ status: 'deployed' })
  if (firstTime) {
    const credentials = values.apps.keycloak
    const message = `
    ########################################################################################################################################
    #
    #  To start using Otomi, go to https://otomi.${values.cluster.domainSuffix} and sign in to the web console
    #  with username "${credentials.adminUsername}" and password "${credentials.adminPassword}".
    #  Then activate Drone. For more information see: https://otomi.io/docs/get-started/activation
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
