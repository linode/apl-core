/* eslint-disable no-param-reassign */
import { writeFileSync } from 'fs'
import { each } from 'lodash'
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

const getApiKey = (provider) => {
  switch (provider) {
    case 'opsgenie':
      return 'apiKey'
    default:
      throw new Error(`No such provider that has 'apiKey': ${provider}`)
  }
}

const getUrlKey = (provider) => {
  switch (provider) {
    case 'slack':
    case 'opsgenie':
      return 'url'
    case 'msteams':
      return 'lowPrio'
    default:
      throw new Error(`No such provider: ${provider}`)
  }
}

export const genDrone = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:genDrone`)
  const argv: Arguments = getParsedArgs()
  const allValues = (await hfValues()) as Record<string, any>
  if (allValues.apps?.drone?.enabled !== undefined && !allValues.apps?.drone?.enabled) {
    return
  }
  const branch = allValues.apps?.['otomi-api']?.git?.branch ?? 'main'

  const r = {
    alerts: {},
    home: {},
  }

  each({ alerts: allValues.alerts?.drone || [], home: allValues.home?.drone || [] }, (providers, type) => {
    providers.forEach((provider) => {
      const holder: Record<string, any> = {}
      // shared amongst all
      holder.provider = provider
      holder.webhook = allValues[type][provider][getUrlKey(provider)]
      // exceptions
      if (provider === 'slack') {
        holder.channel = allValues[type]?.[provider]?.channel ?? 'mon-otomi'
      }
      if (provider === 'opsgenie') {
        holder.apiKey = allValues[type][provider][getApiKey(provider)]
        holder.responders = allValues[type]?.[provider]?.responders
      }
      r[type][provider] = holder
    })
  })

  const cluster = allValues.cluster?.name
  const owner = allValues.cluster?.owner
  const cloudProvider = allValues.cluster?.provider
  const globalPullSecret = allValues.otomi?.globalPullSecret
  const imageTag = await getImageTag()
  const pullPolicy = imageTag.startsWith('v') ? 'if-not-exists' : 'always'
  const requestsCpu = allValues.apps.drone.resources?.runner?.requests?.cpu
  const requestsMem = allValues.apps.drone.resources?.runner?.requests?.memory

  const obj = {
    imageTag,
    branch,
    cluster,
    cloudProvider,
    globalPullSecret,
    owner,
    pullPolicy,
    requestsCpu,
    requestsMem,
    r,
  }

  const output = (await gucci(`${rootDir}/tpl/.drone.yml.gotmpl`, obj, true)) as string

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
