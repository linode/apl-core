import { Argv } from 'yargs'
import { $ } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { Arguments as HelmArgs, helmOptions } from '../common/helm-opts'
import { ENV } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments as DroneArgs, genDrone } from './gen-drone'
import { validateValues } from './validate-values'

const fileName = 'commit'
let debug: OtomiDebugger

interface Arguments extends HelmArgs, DroneArgs {}

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
  otomi.closeIfInCore(fileName, debug)
}

export const commit = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  await $`git -C ${ENV.DIR} pull`
  await validateValues(argv)

  const gitDiff: string = (await $`git -C ${ENV.DIR} diff --name-only`).stdout.trim()
  if (gitDiff.includes('cluster.yaml')) await genDrone(argv)
  await $`git -C ${ENV.DIR} add . && git -C ${ENV.DIR} commit -m 'Manual commit' --no-verify`
}

export const module = {
  command: fileName,
  // As discussed: https://otomi.slack.com/archives/C011D78FP47/p1623843840012900
  describe: 'Execute wrapper for generate pipelines -> git commit changed files',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    ENV.PARSED_ARGS = argv
    await commit(argv, { skipKubeContextCheck: true })
  },
}

export default module
