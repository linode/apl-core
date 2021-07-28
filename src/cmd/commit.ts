import { Argv } from 'yargs'
import { $, cd, nothrow } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { capitalize, getFilename, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments as HelmArgs, helmOptions } from '../common/yargs-opts'
import { Arguments as DroneArgs, genDrone } from './gen-drone'
import { validateValues } from './validate-values'

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

interface Arguments extends HelmArgs, DroneArgs {}

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await otomi.prepareEnvironment(options)
  otomi.exitIfInCore(cmdName)
}

export const preCommit = async (argv: DroneArgs): Promise<void> => {
  const pcDebug = terminal('Pre Commit')
  pcDebug.info('Check for cluster diffs')
  await nothrow($`git config diff.sopsdiffer.textconv "sops -d"`)
  const settingsDiff = (await $`git diff env/settings.yaml`).stdout.trim()
  const secretDiff = (await $`git diff env/secrets.settings.yaml`).stdout.trim()

  const versionChanges = settingsDiff.includes('+    version:')
  const secretChanges = secretDiff.includes('+        url: https://hooks.slack.com/')
  if (versionChanges || secretChanges) await genDrone(argv)
}

export const _commit = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  await validateValues(argv)

  debug.info('Preparing values')

  const currDir = process.cwd()
  cd(env.ENV_DIR)

  const vals = await hfValues()
  const ownerName = vals.cluster?.owner ?? 'otomi'
  const clusterDomain = vals.cluster.domainSuffix ?? vals.cluster.apiName

  try {
    await $`git config --local user.name`
  } catch (error) {
    await $`git config --local user.name ${capitalize(ownerName)}`
  }
  try {
    await $`git config --local user.email`
  } catch (error) {
    await $`git config --local user.email ${ownerName}@${clusterDomain}`
  }

  preCommit(argv)
  debug.info('Do commit')
  await $`git add .`
  await $`git commit -m 'Manual commit' --no-verify`

  debug.info('Pulling latest values')
  try {
    await $`git pull`
  } catch (error) {
    debug.error(
      `When trying to pull from ${clusterDomain} merge conflicts occured\nPlease resolve these and run \`otomi commit\` again.`,
    )
    process.exit(1)
  }
  try {
    await $`git remote show origin`
    await $`git push origin main`
    debug.log('Sucessfully pushed the updated values')
  } catch (error) {
    debug.error(error.stderr)
    debug.error('Pushing the values failed, please read the above error message and manually try again')
    process.exit(1)
  } finally {
    cd(currDir)
  }
}

export const module = {
  command: cmdName,
  // As discussed: https://otomi.slack.com/archives/C011D78FP47/p1623843840012900
  describe: 'Execute wrapper for generate pipelines -> git commit changed files',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await _commit(argv, { skipKubeContextCheck: true })
  },
}

export default module
