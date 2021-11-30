import { writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getFilename, gucci, rootDir } from '../common/utils'
import { getImageTag } from '../common/values'
import { BasicArguments, getParsedArgs, setParsedArgs } from '../common/yargs-opts'

export interface Arguments extends BasicArguments {
  dryRun?: boolean
}

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const genDrone = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  const allValues = await hfValues()
  if (!allValues?.charts?.drone?.enabled) {
    return
  }
  const receiver = allValues.alerts?.drone
  const homeReceiver = allValues.home?.drone
  const branch = allValues.charts?.['otomi-api']?.git?.branch ?? 'main'

  let webhook
  let webhookHome
  let channel
  let channelHome
  if (receiver) {
    const key = receiver === 'slack' ? 'url' : 'lowPrio'
    channel = receiver === 'slack' ? allValues.alerts?.[receiver]?.channel ?? 'mon-otomi' : undefined
    webhook = allValues.alerts?.[receiver]?.[key]
    if (!webhook) throw new Error(`Could not find webhook url in 'alerts.${receiver}.${key}'`)
  }
  if (homeReceiver) {
    const key = homeReceiver === 'slack' ? 'url' : 'lowPrio'
    channelHome = receiver === 'slack' ? allValues.home?.[homeReceiver]?.channel ?? 'mon-otomi' : undefined
    webhookHome = allValues.home?.[homeReceiver]?.[key]
    if (!webhookHome) throw new Error(`Could not find webhook url in 'home.${homeReceiver}.${key}'`)
  }

  const cluster = allValues.cluster?.name
  const owner = allValues.cluster?.owner
  const cloudProvider = allValues.cluster?.provider
  const globalPullSecret = allValues.otomi?.globalPullSecret
  const provider = allValues.alerts?.drone
  const providerHome = allValues.home?.drone
  const imageTag = await getImageTag()
  const pullPolicy = imageTag.startsWith('v') ? 'if-not-exists' : 'always'
  const requestsCpu = allValues.charts.drone.resources.runner.requests.cpu
  const requestsMem = allValues.charts.drone.resources.runner.requests.memory

  const obj = {
    imageTag,
    branch,
    cluster,
    cloudProvider,
    channel,
    channelHome,
    owner,
    globalPullSecret,
    provider,
    providerHome,
    webhook,
    webhookHome,
    pullPolicy,
    requestsCpu,
    requestsMem,
  }

  const output = (await gucci(`${rootDir}/tpl/.drone.yml.gotmpl`, obj)) as string

  // TODO: Remove when validate-values can validate subpaths
  if (!output) {
    debug.warn('Something went wrong trying to template using gucci')
    return
  }

  if (argv.dryRun) {
    debug.log(output)
  } else {
    const file = `${env.ENV_DIR}/.drone.yml`
    writeFileSync(file, output)
    debug.debug('.drone.yml: ', output)
    debug.log(`gen-drone is finished and the pipeline configuration is written to: ${file}`)
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
