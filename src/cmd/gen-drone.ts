import { writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getFilename, gucci, rootDir } from '../common/utils'
import { getImageTag } from '../common/values'
import { BasicArguments, getParsedArgs, setParsedArgs } from '../common/yargs'

export interface Arguments extends BasicArguments {
  dryRun?: boolean
}

const cmdName = getFilename(__filename)

const getApiKey = (receiver) => {
  switch (receiver) {
    case 'opsgenie':
      return 'apiKey'
    default:
      return undefined
  }
}

const getUrlKey = (receiver) => {
  switch (receiver) {
    case 'drone':
    case 'opsgenie':
      return 'url'
    case 'msteams':
      return 'lowPrio'
    default:
      return undefined
  }
}

export const genDrone = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:genDrone`)
  const argv: Arguments = getParsedArgs()
  const allValues = (await hfValues()) as Record<string, any>
  if (allValues.apps?.drone?.enabled !== undefined && !allValues.apps?.drone?.enabled) {
    return
  }
  const receiver = allValues.alerts?.drone
  const homeReceiver = allValues.home?.drone
  const branch = allValues.apps?.['otomi-api']?.git?.branch ?? 'main'

  let webhook
  let webhookHome
  let channel
  let channelHome
  let apiKey
  let apiKeyHome
  let responders
  let respondersHome
  if (receiver) {
    apiKey = getApiKey(receiver)
    const key = getUrlKey(receiver)
    if (receiver === 'slack') channel = allValues.alerts?.[receiver]?.channel ?? 'mon-otomi'
    if (receiver === 'opsgenie') responders = allValues.alerts?.[receiver]?.responders
    webhook = key && allValues.alerts?.[receiver]?.[key]
    if (!webhook) throw new Error(`Could not find webhook url in 'alerts.${receiver}.${key}'`)
  }
  if (homeReceiver) {
    apiKeyHome = getApiKey(homeReceiver)
    const key = getUrlKey(homeReceiver)
    if (receiver === 'slack') channelHome = allValues.home?.[homeReceiver]?.channel ?? 'mon-otomi'
    if (homeReceiver === 'opsgenie') respondersHome = allValues.home?.[homeReceiver]?.responders
    webhookHome = key && allValues.home?.[homeReceiver]?.[key]
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
  const requestsCpu = allValues.apps.drone.resources?.runner?.requests?.cpu
  const requestsMem = allValues.apps.drone.resources?.runner?.requests?.memory

  const obj = {
    apiKey,
    apiKeyHome,
    imageTag,
    branch,
    cluster,
    cloudProvider,
    channel,
    channelHome,
    globalPullSecret,
    owner,
    provider,
    providerHome,
    pullPolicy,
    requestsCpu,
    requestsMem,
    responders,
    webhook,
    webhookHome,
  }

  const output = (await gucci(`${rootDir}/tpl/.drone.yml.gotmpl`, obj)) as string

  // TODO: Remove when validate-values can validate subpaths
  if (!output) {
    d.warn('Something went wrong trying to template using gucci')
    return
  }

  if (argv.dryRun) {
    d.log(output)
  } else {
    const file = `${env.ENV_DIR}/.drone.yml`
    writeFileSync(file, output)
    d.debug('.drone.yml: ', output)
    d.log(`gen-drone is finished and the pipeline configuration is written to: ${file}`)
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
