import retry, { Options } from 'async-retry'
import { mkdirSync, rmSync } from 'fs'
import { cloneDeep } from 'lodash'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { deletePendingHelmReleases, getDeploymentState, setDeploymentState } from 'src/common/k8s'
import { getFilename, rootDir } from 'src/common/utils'
import { getImageTagFromValues, getPackageVersion } from 'src/common/values'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv, CommandModule } from 'yargs'
import { cd } from 'zx'
import { runtimeUpgrade } from '../common/runtime-upgrade'
import { applyAsApps, applyGitOpsApps, updateOperatorApplication } from './apply-as-apps'
import { applyTeams } from './apply-teams'
import { commit } from './commit'

const cmdName = getFilename(__filename)
const dir = '/tmp/otomi/'

const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  rmSync(dir, { recursive: true })
}

const setup = (): void => {
  const argv: HelmArguments = getParsedArgs()
  cleanupHandler(() => cleanup(argv))
  mkdirSync(dir, { recursive: true })
}

export const applyAll = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:applyAll`)
  const argv: HelmArguments = getParsedArgs()

  const tag = await getImageTagFromValues()
  const revisionUpdated = await updateOperatorApplication(env.APPS_REVISION || tag)
  if (revisionUpdated) {
    d.info('Operator has pending update to a different revision. Pausing until restart.')
    return
  }
  const deployingVersion = getPackageVersion()
  await setDeploymentState({ status: 'deploying', deployingTag: tag, deployingVersion })
  const deploymentState = await getDeploymentState()

  await runtimeUpgrade({ when: 'pre', deploymentState })

  d.info('Start apply all')
  d.info(`Deployment state: ${JSON.stringify(deploymentState)}`)

  // We still need to deploy all teams because some settings depend on platform apps.
  const teamsApplyCompleted = await applyTeams()
  if (!teamsApplyCompleted) {
    d.info('Teams apply step not completed')
  }
  // Note that team-ns-admin contains ingress for platform apps.
  const params = cloneDeep(argv)
  await applyAsApps(params)

  await runtimeUpgrade({ when: 'post', deploymentState })

  if (!(env.isDev && env.DISABLE_SYNC)) {
    await commit(false)
  }
  await applyGitOpsApps()
  await setDeploymentState({ status: 'deployed', version: deployingVersion })
  d.info('Deployment completed')
}

export const apply = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:apply`)
  const argv: HelmArguments = getParsedArgs()
  const retryOptions: Options = {
    factor: 1,
    retries: 3,
    maxTimeout: 30000,
  }
  if (!argv.label && !argv.file) {
    await retry(async () => {
      try {
        cd(rootDir)
        await applyAll()
      } catch (e) {
        d.error(e)
        d.info(`Retrying in ${retryOptions.maxTimeout} ms`)
        await deletePendingHelmReleases()
        throw e
      }
    }, retryOptions)

    return
  }
  d.info('Start apply')
  await applyTeams()
  await applyAsApps(argv)
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply k8s resources for ongoing deployments (not initial installation)',
  builder: (parser: Argv): Argv => helmOptions(parser),
  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    setup()
    await prepareEnvironment()
    await apply()
  },
}
