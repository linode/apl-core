import { copyFileSync, existsSync } from 'fs'
import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { OtomiDebugger, terminal } from '../../common/debug'
import { env } from '../../common/envalid'
import { hfValues } from '../../common/hf'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../../common/setup'
import { BasicArguments, currDir, getFilename, gitPush, setParsedArgs } from '../../common/utils'

type Arguments = BasicArguments

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await otomi.prepareEnvironment(options)
}

export const bootstrapGit = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  if (existsSync(`${env.ENV_DIR}/.git`)) {
    debug.info('Values repo already git initialized.')
    return
  }
  debug.info('Initializing values repo.')
  const currDirVal = await currDir()

  await $`git init ${env.ENV_DIR}`
  copyFileSync(`${currDirVal}/bin/hooks/pre-commit`, `${env.ENV_DIR}/.git/hooks/pre-commit`)

  const chartValues = await hfValues()
  // now we can change pwd to avoid a lot of git boilerplating
  cd(env.ENV_DIR)

  const stage = chartValues?.charts?.['cert-manager']?.stage ?? 'production'
  if (stage === 'staging') process.env.GIT_SSL_NO_VERIFY = 'true'

  const giteaEnabled = chartValues?.charts?.gitea?.enabled ?? true
  const clusterDomain = chartValues?.cluster?.domainSuffix
  const byor = !!chartValues?.charts?.['otomi-api']?.git

  if (!giteaEnabled && !byor) {
    debug.error('Gitea was disabled but no charts.otomi-api.git config was given.')
    process.exit(1)
  }
  let username = 'Otomi Admin'
  let email
  let password
  let remote
  const branch = 'main'
  let healthUrl
  if (!giteaEnabled) {
    const otomiApiGit = chartValues?.charts?.['otomi-api']?.git
    username = otomiApiGit?.user
    password = otomiApiGit?.password
    email = `otomi-admin@${clusterDomain}`
    remote = otomiApiGit?.repoUrl
    healthUrl = remote
  } else {
    username = 'otomi-admin'
    password = chartValues?.charts?.gitea?.adminPassword ?? chartValues?.otomi?.adminPassword
    const giteaUrl = `gitea.${clusterDomain}`
    const giteaOrg = 'otomi'
    const giteaRepo = 'values'
    healthUrl = `https://gitea.${clusterDomain}`
    remote = `https://${username}:${password}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git`
  }
  await $`git config --local user.name ${username}`
  await $`git config --local user.password ${password}`
  await $`git config --local user.email ${email}`
  await $`git checkout -b ${branch}`
  await $`git remote add origin ${remote}`
  cd(currDirVal)
}

export const module = {
  command: cmdName,
  describe: 'Bootstrap git settings',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await bootstrapGit(argv, {})
  },
}

export default module
