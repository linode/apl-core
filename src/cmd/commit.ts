import { existsSync } from 'fs'
import { Argv } from 'yargs'
import { $, cd, nothrow } from 'zx'
import { encrypt } from '../common/crypt'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { exitIfInCore, prepareEnvironment, PrepareEnvironmentOptions } from '../common/setup'
import { currDir, getFilename, OtomiDebugger, setParsedArgs, terminal, waitTillAvailable } from '../common/utils'
import { Arguments as HelmArgs } from '../common/yargs-opts'
import { bootstrapGit } from './bootstrap'
import { Arguments as DroneArgs, genDrone } from './gen-drone'
import { getChartValues } from './lib/chart'
import { pull } from './pull'
import { validateValues } from './validate-values'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

interface Arguments extends HelmArgs, DroneArgs {}

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (options) await prepareEnvironment(options)
  exitIfInCore(cmdName)
}

export const preCommit = async (argv: DroneArgs): Promise<void> => {
  const pcDebug = terminal('Pre Commit')
  pcDebug.info('Check for cluster diffs')
  await nothrow($`git config --local diff.sopsdiffer.textconv "sops -d"`)
  const settingsDiff = (await $`git diff env/settings.yaml`).stdout.trim()
  const secretDiff = (await $`git diff env/secrets.settings.yaml`).stdout.trim()

  const versionChanges = settingsDiff.includes('+    version:')
  const secretSlackChanges = secretDiff.includes('+        url: https://hooks.slack.com/')
  const secretMsTeamsLowPrioChanges = secretDiff.includes('+        lowPrio: https://')
  const secretMsTeamsHighPrioChanges = secretDiff.includes('+        highPrio: https://')
  if (versionChanges || secretSlackChanges || secretMsTeamsLowPrioChanges || secretMsTeamsHighPrioChanges)
    await genDrone(argv)
}

export const gitPush = async (
  branch: string,
  sslVerify: boolean,
  giteaUrl: string | undefined = undefined,
): Promise<boolean> => {
  const gitDebug = terminal('gitPush')
  gitDebug.info('Starting git push.')
  let skipSslVerify = ''
  if (giteaUrl) {
    if (!sslVerify) skipSslVerify = '-c http.sslVerify=false'
    await waitTillAvailable(giteaUrl)
  }

  const cwd = await currDir()
  cd(env.ENV_DIR)
  try {
    await $`git ${skipSslVerify} push -u origin ${branch} -f`
    gitDebug.log('Otomi values have been pushed to git.')
    return true
  } catch (error) {
    gitDebug.error(error)
    return false
  } finally {
    cd(cwd)
  }
}

export const commit = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  await validateValues(argv)

  debug.info('Preparing values')

  const cwd = await currDir()
  cd(env.ENV_DIR)

  const values = getChartValues() ?? (await hfValues())
  const clusterDomain = values?.cluster.domainSuffix ?? values?.cluster.apiName

  preCommit(argv)
  await encrypt()
  debug.info('Committing values')
  await $`git add -A`
  await $`git commit -m 'otomi commit' --no-verify`

  if (!env.CI) await pull(argv, options)
  let healthUrl
  let branch
  if (!values.charts?.gitea?.enabled) {
    healthUrl = `gitea.${clusterDomain}`
    branch = 'main'
  } else {
    // @ts-ignore
    branch = values.charts!['otomi-api']!.git!.branch ?? 'main'
  }

  try {
    const sslVerify = values.charts?.['cert-manager']?.stage === 'staging'
    await $`git remote show origin`
    await gitPush(branch, sslVerify, healthUrl)
    debug.log('Successfully pushed the updated values')
  } catch (error) {
    debug.error(error.stderr)
    debug.error('Pushing the values failed, please read the above error message and manually try again')
    process.exit(1)
  } finally {
    cd(cwd)
  }
}

export const module = {
  command: cmdName,
  describe: 'Execute wrapper for generate pipelines -> git commit changed files',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    const options = { skipKubeContextCheck: true }
    if (!env.CI && existsSync(`${env.ENV_DIR}/.git`)) {
      debug.info('Values repo already git initialized.')
      await pull(argv, options)
    } else {
      await bootstrapGit()
    }
    await commit(argv, options)
  },
}

export default module
