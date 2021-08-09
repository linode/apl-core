import { copyFileSync, rmSync } from 'fs'
import { Argv } from 'yargs'
import { $, cd, nothrow } from 'zx'
import { OtomiDebugger, terminal } from '../../common/debug'
import { env } from '../../common/envalid'
import { hfValues } from '../../common/hf'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../../common/setup'
import { BasicArguments, currDir, getFilename, setParsedArgs } from '../../common/utils'
import { stream } from '../../common/zx-enhance'

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
  const currDirVal = await currDir()
  await $`git init ${env.ENV_DIR}`
  copyFileSync(`${currDirVal}/bin/hooks/pre-commit`, `${env.ENV_DIR}/.git/hooks/pre-commit`)

  const chartValues = await hfValues()
  const stage = chartValues?.charts?.['cert-manager']?.stage ?? 'production'
  if (stage === 'staging') process.env.GIT_SSL_NO_VERIFY = 'true'

  const giteaEnabled = chartValues?.charts?.gitea?.enabled ?? true
  const clusterDomain = chartValues?.cluster?.domainSuffix
  const byor = !!chartValues?.charts?.['otomi-api']?.git

  if (!giteaEnabled && !byor) {
    debug.error('Gitea was disabled but no charts.otomi-api.git config was given.')
    process.exit(1)
  }
  const currDirVar = await currDir()
  if (env.OTOMI_DEV) {
    rmSync(`${env.ENV_DIR}/.git`, { recursive: true, force: true })
    rmSync(`${env.ENV_DIR}/.vscode`, { recursive: true, force: true })
    rmSync(`${env.ENV_DIR}/*`, { recursive: true, force: true })
  }
  cd(env.ENV_DIR)
  let username = 'Otomi Admin'
  let email = `otomi-admin@${clusterDomain}`
  let password = ''
  let remote = ''
  let branch = 'main'
  if (!giteaEnabled) {
    const otomiApiGit = chartValues?.charts?.['otomi-api']?.git
    username = otomiApiGit?.user
    password = otomiApiGit?.password
    email = otomiApiGit?.email ?? email
    remote = otomiApiGit?.repoUrl
    branch = otomiApiGit?.branch ?? branch
  } else {
    const giteaUser = 'otomi-admin'
    const giteaPassword = chartValues?.charts?.gitea?.adminPassword ?? chartValues?.otomi?.adminPassword
    const giteaUrl = `gitea.${clusterDomain}`
    const giteaOrg = 'otomi'
    const giteaRepo = 'values'
    remote = `https://${giteaUser}:${giteaPassword}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git`
  }
  await Promise.all([
    $`git config --local user.name "${username}"`,
    $`git config --local user.password "${password}"`,
    $`git config --local user.email "${email}"`,
    $`git remote add origin "${remote}"`,
  ])
  debug.info('Trying to do a git pull')
  await stream(nothrow($`git checkout -b ${branch}`), { stdout: debug.stream.info, stderr: debug.stream.error })
  await stream(nothrow($`git pull origin ${branch}`), { stdout: debug.stream.info, stderr: debug.stream.error })
  cd(currDirVar)
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
