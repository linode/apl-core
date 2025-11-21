import retry, { Options } from 'async-retry'
import { mkdirSync, rmSync } from 'fs'
import { cloneDeep } from 'lodash'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { getDeploymentState, setDeploymentState } from 'src/common/k8s'
import { getFilename, rootDir } from 'src/common/utils'
import { getImageTagFromValues, getPackageVersion } from 'src/common/values'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv, CommandModule } from 'yargs'
import { cd } from 'zx'
import { runtimeUpgrade } from '../common/runtime-upgrade'
import { applyAsApps } from './apply-as-apps'
import { applyTeams } from './apply-teams'
import { commit } from './commit'
import { collectTraces } from './traces'

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

export const applyAll = async () => {
  const d = terminal(`cmd:${cmdName}:applyAll`)
  const prevState = await getDeploymentState()
  const argv: HelmArguments = getParsedArgs()

  await runtimeUpgrade({ when: 'pre' })

  d.info('Start apply all')
  d.info(`Deployment state: ${JSON.stringify(prevState)}`)
  const tag = await getImageTagFromValues()
  const deployingVersion = getPackageVersion()
  await setDeploymentState({ status: 'deploying', deployingTag: tag, deployingVersion })

  // We still need to deploy all teams because some settings depend on platform apps.
  const teamsApplyCompleted = await applyTeams()
  if (!teamsApplyCompleted) {
    d.info('Teams apply step not completed')
  }
  // Note that team-ns-admin contains ingress for platform apps.
  const params = cloneDeep(argv)
  const appsApplyCompleted = await applyAsApps(params)

  if (appsApplyCompleted) {
    await runtimeUpgrade({ when: 'post' })
  } else {
    d.info('Apps apply step not completed, skipping upgrade checks')
  }

  if (!(env.isDev && env.DISABLE_SYNC)) {
    await commit(false)
  }
  if (appsApplyCompleted) {
    await setDeploymentState({ status: 'deployed', version: deployingVersion })
    d.info('Deployment completed')
  } else {
    d.info('Deployment finished with actions pending')
  }
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
        // Collect traces on apply failure
        try {
          await collectTraces()
        } catch (traceError) {
          d.error('Failed to collect traces:', traceError)
        }
        d.info(`Retrying in ${retryOptions.maxTimeout} ms`)
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
