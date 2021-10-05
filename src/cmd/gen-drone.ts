import { writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getImageTag, prepareEnvironment } from '../common/setup'
import {
  BasicArguments,
  getFilename,
  getParsedArgs,
  gucci,
  OtomiDebugger,
  rootDir,
  setParsedArgs,
  terminal,
} from '../common/utils'

export interface Arguments extends BasicArguments {
  dryRun?: boolean
}

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const genDrone = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  const allValues = await hfValues()
  if (!allValues.charts?.drone?.enabled) {
    return
  }
  const receiver = allValues.alerts?.drone
  const branch = allValues.charts?.['otomi-api']?.git?.branch ?? 'main'

  let webhook
  let channel
  if (receiver) {
    const key = receiver === 'slack' ? 'url' : 'lowPrio'
    channel = receiver === 'slack' ? allValues.alerts?.[receiver]?.channel ?? 'dev-mon' : undefined
    webhook = allValues.alerts?.[receiver]?.[key]
    if (!webhook) throw new Error(`Could not find webhook url in 'alerts.${receiver}.${key}'`)
  }

  const cluster = allValues.cluster?.name
  const owner = allValues.cluster?.owner
  const cloudProvider = allValues.cluster?.provider
  const globalPullSecret = allValues.otomi?.globalPullSecret
  const provider = allValues.alerts?.drone
  const imageTag = getImageTag()
  const pullPolicy = imageTag.startsWith('v') ? 'if-not-exists' : 'always'

  const obj = {
    imageTag,
    branch,
    cluster,
    cloudProvider,
    channel,
    owner,
    globalPullSecret,
    provider,
    webhook,
    pullPolicy,
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
    debug.log(`gen-drone is done and the configuration is written to: ${file}`)
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
