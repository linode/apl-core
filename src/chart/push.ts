#!/usr/bin/env -S node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import yargs, { Argv } from 'yargs'
import { $ } from 'zx'
import { encrypt } from '../cmd/encrypt'
import { genSops } from '../cmd/gen-sops'
import { OtomiDebugger, terminal } from '../common/debug'
import { BasicArguments, ENV, loadYaml } from '../common/no-deps'
import { cleanupHandler } from '../common/setup'
import { getFilename } from './common'

const fileName = getFilename(import.meta.url)
let debug: OtomiDebugger

export interface Arguments extends BasicArguments {
  valuesInput: string
}

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = (argv: Arguments): void => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)
}

export const push = async (argv: Arguments): Promise<void> => {
  const args = { ...argv }
  setup(args)

  await genSops({ ...argv, dryRun: false }, {})
  if (existsSync(`${ENV.DIR}/.sops.yaml`)) {
    await encrypt(argv)
  }
  const apiFile = `${ENV.DIR}/env/chart/otomi-api.yaml`
  const apiContent = loadYaml(apiFile)
  const branch = apiContent?.charts?.['otomi-api']?.git?.branch || 'main'

  const chartValues = loadYaml(argv.valuesInput)
  const stage = chartValues?.charts?.['cert-manager']?.stage ?? 'production'
  if (stage === 'staging') process.env.GIT_SSL_NO_VERIFY = 'true'

  const giteaEnabled = chartValues?.charts?.gitea?.enabled ?? true
  const clusterDomain = chartValues?.cluster?.domainSuffix

  if (giteaEnabled) {
    debug.log('Waiting for gitea to come up')
    const domain = `gitea.${clusterDomain}`
  }

  await $`echo 1`
}

export const module = {
  command: fileName,
  describe: 'Push values using the chart',
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    ENV.PARSED_ARGS = argv
    try {
      await push(argv)
    } catch (error) {
      debug.exit(1, error)
    }
  },
}

export default module

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await yargs([...process.argv].slice(1))
    .scriptName(fileName)
    .command({ ...module, command: [module.command, '$0'] })
    .env('OTOMI')
    .parseAsync()
}
