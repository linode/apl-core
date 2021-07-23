#!/usr/bin/env -S node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm
import { existsSync } from 'fs'
import { rm } from 'fs/promises'
import fetch from 'node-fetch'
import { fileURLToPath } from 'url'
import yargs, { Argv } from 'yargs'
import { $, cd } from 'zx'
import { encrypt } from '../cmd/encrypt'
import { genSops } from '../cmd/gen-sops'
import { OtomiDebugger, terminal } from '../common/debug'
import { BasicArguments, ENV, loadYaml, readdirRecurse } from '../common/no-deps'
import { cleanupHandler } from '../common/setup'
import { delay, getFilename } from './common'

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
    const subsequentExists = 3
    let count = 0
    // Need to wait for 3 subsequent exists, since DNS doesn't always propagate equally
    do {
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(domain, { redirect: 'follow' })
        if (res.ok) {
          count += 1
        } else {
          count = 0
        }
      } catch (_) {
        count = 0
      }
      // eslint-disable-next-line no-await-in-loop
      await delay(250)
    } while (count < subsequentExists)
  }
  const currDir = ENV.PWD
  cd(ENV.DIR)
  debug.log('Committing values')
  await $`git add -A`
  await $`git commit --no-verify -m 'automated commit of otomi-values'`
  debug.log('Pushing values')
  const pushResult = await $`git push --set-upstream origin ${branch}`
  cd(currDir)
  if (pushResult.exitCode !== 0) {
    debug.exit(1, pushResult.stderr)
  } else {
    debug.log('Done')
  }
  const decFiles = (await readdirRecurse(`${ENV.DIR}/env`)).filter(
    (file) => file.endsWith('.yaml.dec') && file.includes('/secrets'),
  )
  await Promise.all(decFiles.map(async (file) => rm(file, { force: true })))
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
