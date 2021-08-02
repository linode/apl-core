#!/usr/bin/env -S node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm
import { existsSync } from 'fs'
import { rm } from 'fs/promises'
import { fileURLToPath } from 'url'
import yargs, { Argv } from 'yargs'
import { $, cd } from 'zx'
import { encrypt } from '../cmd/encrypt'
import { genSops } from '../cmd/gen-sops'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { cleanupHandler } from '../common/setup'
import { BasicArguments, currDir, loadYaml, readdirRecurse, setParsedArgs, waitTillAvailable } from '../common/utils'
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
  if (existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    await encrypt(argv)
  }
  const apiFile = `${env.ENV_DIR}/env/chart/otomi-api.yaml`
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
    await waitTillAvailable(domain)
  }
  const currDirVar = await currDir()
  cd(env.ENV_DIR)
  debug.log('Committing values')
  await $`git add -A`
  await $`git commit --no-verify -m 'automated commit of otomi-values'`
  debug.log('Pushing values')
  const pushResult = await $`git push --set-upstream origin ${branch}`
  cd(currDirVar)
  if (pushResult.exitCode !== 0) {
    debug.error(pushResult.stderr)
    process.exit(1)
  } else {
    debug.log('Done')
  }
  const decFiles = (await readdirRecurse(`${env.ENV_DIR}/env`)).filter(
    (file) => file.endsWith('.yaml.dec') && file.includes('/secrets'),
  )
  await Promise.all(decFiles.map(async (file) => rm(file, { force: true })))
}

export const module = {
  command: fileName,
  describe: 'Push values using the chart',
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    try {
      await push(argv)
    } catch (error) {
      debug.error(error)
      process.exit(1)
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
