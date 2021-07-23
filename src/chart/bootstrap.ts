#!/usr/bin/env -S node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm
import { copyFileSync, existsSync, rmSync } from 'fs'
import { fileURLToPath } from 'url'
import yargs, { Argv } from 'yargs'
import { $, cd } from 'zx'
import { bootstrap as bootstrapFunc } from '../cmd/bootstrap'
import { decrypt } from '../cmd/decrypt'
import { OtomiDebugger, terminal } from '../common/debug'
import { BasicArguments, ENV, loadYaml } from '../common/no-deps'
import { cleanupHandler } from '../common/setup'
import { stream } from '../common/zx-enhance'
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

export const bootstrap = async (argv: Arguments): Promise<void> => {
  const args = { ...argv }
  setup(args)
  const chartValues = loadYaml(argv.valuesInput)
  const stage = chartValues?.charts?.['cert-manager']?.stage ?? 'production'
  if (stage === 'staging') process.env.GIT_SSL_NO_VERIFY = 'true'

  const giteaEnabled = chartValues?.charts?.gitea?.enabled ?? true
  const clusterDomain = chartValues?.cluster?.domainSuffix
  const byor = !!chartValues?.charts?.['otomi-api']?.git
  if (!clusterDomain) throw new Error('cluster.domainSuffix was not set')

  if (!giteaEnabled && !byor) debug.exit(1, 'Gitea was disabled but no charts.otomi-api.git config was given.')

  if (!ENV.PWD.startsWith('/home/app/stack')) {
    rmSync(`${ENV.DIR}/.git`, { recursive: true, force: true })
    rmSync(`${ENV.DIR}/.vscode`, { recursive: true, force: true })
    rmSync(`${ENV.DIR}/*`, { recursive: true, force: true })
  }
  const currDir = ENV.PWD
  cd(ENV.DIR)
  let username = 'Otomi Admin'
  let email = `otomi-admin@${clusterDomain}`
  let password = ''
  let remote = ''
  let branch = 'main'
  if (!giteaEnabled) {
    const otomiApiGit = chartValues?.charts?.['otomi-api']?.git
    username = otomiApiGit?.user
    password = otomiApiGit?.password
    email = otomiApiGit?.email || email
    remote = otomiApiGit?.repoUrl
    branch = otomiApiGit?.branch || branch
  } else {
    const giteaUser = 'otomi-admin'
    const giteaPassword = chartValues?.charts?.gitea?.adminPassword || chartValues?.otomi?.adminPassword
    const giteaUrl = `gitea.${clusterDomain}`
    const giteaOrg = 'otomi'
    const giteaRepo = 'values'
    remote = `https://${giteaUser}:${giteaPassword}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git`
  }
  await Promise.all([
    $`git config user.name "${username}"`,
    $`git config user.password "${password}"`,
    $`git config user.email "${email}"`,
    $`git remote add origin "${remote}"`,
  ])
  debug.verbose('Trying to do a git pull')
  await stream($`git checkout -b ${branch}`, { stdout: debug.stream.verbose, stderr: debug.stream.error })
  await stream($`git pull origin ${branch}`, { stdout: debug.stream.verbose, stderr: debug.stream.error })
  cd(currDir)

  await bootstrapFunc(argv)

  if (existsSync(`${ENV.DIR}/.sops.yaml`)) {
    await decrypt(argv, {})
  }
  copyFileSync('./value-schema.yaml', `${ENV.DIR}/value-schema.yaml`)

  await $`chmod a+w -R ${ENV.DIR}/env`
  debug.log(`Done Bootstrapping`)
}

export const module = {
  command: fileName,
  describe: 'Bootstrap values using the chart',
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    ENV.PARSED_ARGS = argv
    try {
      await bootstrap(argv)
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
