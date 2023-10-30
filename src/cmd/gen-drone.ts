/* eslint-disable no-param-reassign */
import { each } from 'lodash'
import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { hfValues } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

export interface Arguments extends BasicArguments {
  path?: string
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

export const genDrone = async (envDir?: string): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:genDrone`)
  d.info('Drone Generating!')
  const allValues = (await hfValues(undefined, envDir)) as Record<string, any>

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
  d.info('Drone Generated!')
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
