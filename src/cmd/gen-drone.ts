import { writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { BasicArguments, getFilename, gucci, setParsedArgs, startingDir } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'

export interface Arguments extends BasicArguments {
  dryRun?: boolean
}

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await otomi.prepareEnvironment(options)
}

export const genDrone = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  const hfVals = await hfValues()
  if (!hfVals.charts?.drone?.enabled) {
    return
  }
  const receiver = hfVals.alerts?.drone ?? 'slack'
  const branch = hfVals.charts?.['otomi-api']?.git?.branch ?? 'main'

  const key = receiver === 'slack' ? 'url' : 'lowPrio'
  const channel = receiver === 'slack' ? hfVals.alerts?.[receiver]?.channel ?? 'dev-mon' : undefined

  const webhook = hfVals.alerts?.[receiver]?.[key]
  if (!webhook) throw new Error(`Could not find webhook url in 'alerts.${receiver}.${key}'`)

  const cluster = hfVals.cluster?.name
  const globalPullSecret = hfVals.otomi?.globalPullSecret
  const provider = hfVals.alerts.drone
  const pullPolicy = otomi.imageTag().startsWith('v') ? 'if-not-exists' : 'always'

  const obj = {
    imageTag: otomi.imageTag(),
    branch,
    cluster,
    channel,
    customer: otomi.clusterOwner(),
    globalPullSecret,
    provider,
    webhook,
    pullPolicy,
  }

  const output = await gucci(`${startingDir}/tpl/.drone.yml.gotmpl`, obj)
  if (argv.dryRun) {
    debug.log(output)
  } else {
    writeFileSync(`${env.ENV_DIR}/.drone.yml`, output)
    debug.log(`gen-drone is done and the configuration is written to: ${env.ENV_DIR}/.drone.yml`)
  }
}

export const module = {
  command: cmdName,
  describe: undefined,
  builder: (parser: Argv): Argv =>
    parser.options({
      'dry-run': {
        alias: ['d'],
        boolean: true,
        default: false,
        hidden: true,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await genDrone(argv, { skipKubeContextCheck: true })
  },
}

export default module
