import { writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $ } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { hfValues } from '../common/hf'
import { BasicArguments, ENV } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'

export interface Arguments extends BasicArguments {
  dryRun: boolean
  d: boolean
  'dry-run': boolean
}

const fileName = 'gen-drone'
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
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
    customer: otomi.customerName(),
    globalPullSecret,
    provider,
    webhook,
    pullPolicy,
  }
  const args = Object.entries(obj).map((k, v) => `-s ${k}=${v}`)
  const processOutput = await $`gucci ${args} ${ENV.PWD}/tpl/.drone.yml.gotmpl`
  const output = processOutput.stdout
  if (process.env.DRY_RUN || argv.dryRun) {
    debug.log(output)
  } else {
    writeFileSync(`${ENV.DIR}/.drone.yaml`, output)
  }
}

export const module = {
  command: fileName,
  describe: '',
  builder: (parser: Argv): Argv =>
    parser.options({
      'dry-run': {
        alias: ['d'],
        describe: "Dry Run, don't write to file, but to STDOUT",
        group: 'otomi gen-drone options',
        boolean: true,
        default: false,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    ENV.PARSED_ARGS = argv
    await genDrone(argv, { skipKubeContextCheck: true })
  },
}

export default module
