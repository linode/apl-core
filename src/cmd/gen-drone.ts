import { writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getClusterOwner, getImageTag, prepareEnvironment } from '../common/setup'
import {
  BasicArguments,
  getFilename,
  getParsedArgs,
  gucci,
  OtomiDebugger,
  setParsedArgs,
  startingDir,
  terminal,
} from '../common/utils'

export interface Arguments extends BasicArguments {
  dryRun?: boolean
}

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

export const genDrone = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  const allValues = await hfValues()
  if (!allValues.charts?.drone?.enabled) {
    return
  }
  const receiver = allValues.alerts?.drone ?? 'slack'
  const branch = allValues.charts?.['otomi-api']?.git?.branch ?? 'main'

  const key = receiver === 'slack' ? 'url' : 'lowPrio'
  const channel = receiver === 'slack' ? allValues.alerts?.[receiver]?.channel ?? 'dev-mon' : undefined

  const webhook = allValues.alerts?.[receiver]?.[key]
  if (!webhook) throw new Error(`Could not find webhook url in 'alerts.${receiver}.${key}'`)

  const cluster = allValues.cluster?.name
  const globalPullSecret = allValues.otomi?.globalPullSecret
  const provider = allValues.alerts.drone
  const imageTag = getImageTag()
  const pullPolicy = imageTag.startsWith('v') ? 'if-not-exists' : 'always'

  const obj = {
    imageTag,
    branch,
    cluster,
    channel,
    customer: getClusterOwner(),
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
    await prepareEnvironment({ skipKubeContextCheck: true })
    await genDrone()
  },
}

export default module
