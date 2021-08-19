import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { copy } from 'fs-extra'
import { copyFile } from 'fs/promises'
import yaml from 'js-yaml'
import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { encrypt } from '../common/crypt'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getImageTag } from '../common/setup'
import { BasicArguments, currDir, getFilename, loadYaml, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { generateSecrets } from './lib/gen-secrets'
import { genSops } from './gen-sops'
import { getChartValues, mergeValues } from './lib/chart'

export type Arguments = BasicArguments

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

const generateLooseSchema = (cwd: string) => {
  // FIXME: why there are 2 target paths for loose schema?
  const schemaPath = `${cwd}/.vscode/values-schema.yaml`
  const targetPath = `${env.ENV_DIR}/.vscode/values-schema.yaml`
  const sourcePath = `${cwd}/values-schema.yaml`

  const valuesSchema = loadYaml(sourcePath)
  const trimmedVS = JSON.stringify(valuesSchema, (k, v) => (k === 'required' ? undefined : v), 2)
  writeFileSync(targetPath, trimmedVS)
  if (!env.CI && !env.IN_DOCKER) {
    debug.info(`Stored loose YAML schema at: ${schemaPath}`)
    writeFileSync(schemaPath, trimmedVS)
  }
  debug.info(`Stored loose YAML schema at: ${targetPath}`)
}

export const bootstrapGit = async (): Promise<void> => {
  if (existsSync(`${env.ENV_DIR}/.git`)) {
    // scenario 3: pull > bootstrap values
    debug.info('Values repo already git initialized.')
  } else {
    // scenario 1 or 2 (2 will only be called upon first otomi commit)
    debug.info('Initializing values repo.')
    const cwd = await currDir()
    cd(env.ENV_DIR)

    const values = getChartValues() ?? (await hfValues())
    await $`git init ${env.ENV_DIR}`
    copyFileSync(`bin/hooks/pre-commit`, `${env.ENV_DIR}/.git/hooks/pre-commit`)

    const stage = values?.charts?.['cert-manager']?.stage ?? 'production'
    if (stage === 'staging') process.env.GIT_SSL_NO_VERIFY = 'true'

    const giteaEnabled = values?.charts?.gitea?.enabled ?? true
    const clusterDomain = values?.cluster?.domainSuffix
    const byor = !!values?.charts?.['otomi-api']?.git

    if (!giteaEnabled && !byor) {
      debug.error('Gitea was disabled but no charts.otomi-api.git config was given.')
      process.exit(1)
    }
    let username = 'Otomi Admin'
    let email
    let password
    let remote
    const branch = 'main'
    if (!giteaEnabled) {
      const otomiApiGit = values?.charts?.['otomi-api']?.git
      username = otomiApiGit?.user
      password = otomiApiGit?.password
      remote = otomiApiGit?.repoUrl
      email = otomiApiGit?.email
    } else {
      username = 'otomi-admin'
      password = values?.charts?.gitea?.adminPassword ?? values?.otomi?.adminPassword
      email = `otomi-admin@${clusterDomain}`
      const giteaUrl = `gitea.${clusterDomain}`
      const giteaOrg = 'otomi'
      const giteaRepo = 'values'
      remote = `https://${username}:${password}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git`
    }
    await $`git config --local user.name ${username}`
    await $`git config --local user.password ${password}`
    await $`git config --local user.email ${email}`
    await $`git checkout -b ${branch}`
    await $`git remote add origin ${remote}`
    cd(cwd)
  }
}

export const bootstrapValues = async (): Promise<void> => {
  const cwd = await currDir()

  const hasOtomi = existsSync(`${env.ENV_DIR}/bin/otomi`)

  const binPath = `${env.ENV_DIR}/bin`
  mkdirSync(binPath, { recursive: true })
  const otomiImage = `otomi/core:${getImageTag()}`
  debug.info(`Intalling artifacts from ${otomiImage}`)

  await Promise.allSettled([
    copyFile(`${cwd}/bin/aliases`, `${binPath}/aliases`),
    copyFile(`${cwd}/binzx/otomi`, `${binPath}/otomi`),
  ])
  debug.info('Copied bin files')
  debug.info(cwd)
  try {
    mkdirSync(`${env.ENV_DIR}/.vscode`, { recursive: true })
    await copy(`${cwd}/.values/.vscode`, `${env.ENV_DIR}/.vscode`, { overwrite: false, recursive: true })
    debug.info('Copied vscode folder')
  } catch (error) {
    debug.error(error)
    debug.error(`Could not copy from ${cwd}/.values/.vscode`)
    process.exit(1)
  }

  generateLooseSchema(cwd)
  debug.info('Generated loose schema')

  await Promise.allSettled(
    ['.gitattributes', '.secrets.sample']
      .filter((val) => !existsSync(`${env.ENV_DIR}/${val.replace(/\.sample$/g, '')}`))
      .map(async (val) => copyFile(`${cwd}/.values/${val}`, `${env.ENV_DIR}/${val}`)),
  )

  await Promise.allSettled(
    ['.gitignore', '.prettierrc.yml', 'README.md'].map(async (val) =>
      copyFile(`${cwd}/.values/${val}`, `${env.ENV_DIR}/${val}`),
    ),
  )
  if (!existsSync(`${env.ENV_DIR}/env`)) {
    debug.log(`Copying basic values`)
    await copy(`${cwd}/.values/env`, `${env.ENV_DIR}/env`, { overwrite: false, recursive: true })

    // Generate passwords and merge with values only if there are no env folder already (first call to bootstrap)
    const generatedSecrets = yaml.load(await generateSecrets())
    await mergeValues(generatedSecrets)
  }

  if (env.GCLOUD_SERVICE_KEY) {
    writeFileSync(`${env.ENV_DIR}/gcp-key.json`, JSON.stringify(env.GCLOUD_SERVICE_KEY, null, 2))
  }

  debug.log('Copying Otomi Console Setup')
  mkdirSync(`${env.ENV_DIR}/docker-compose`, { recursive: true })
  await copy(`${cwd}/docker-compose`, `${env.ENV_DIR}/docker-compose`, { overwrite: true, recursive: true })
  await Promise.allSettled(
    ['core.yaml', 'docker-compose.yml'].map((val) => copyFile(`${cwd}/${val}`, `${env.ENV_DIR}/${val}`)),
  )

  // If we run from chart installer, VALUES_INPUT will be set
  // Merge user in put values.yaml with current values
  if (env.VALUES_INPUT) {
    const values = loadYaml(env.VALUES_INPUT)
    await mergeValues(values)
  }

  try {
    await genSops()
  } catch (error) {
    debug.error(error.message)
  }

  if (existsSync(`${env.ENV_DIR}/.sops.yaml`)) await encrypt()

  if (!hasOtomi) {
    debug.log('You can now use the otomi CLI')
    debug.log('Start by sourcing aliases:')
    debug.log('. bin/aliases')
  }
  debug.log(`Done Bootstrapping`)
}

export const module = {
  command: cmdName,
  hidden: true,
  describe: 'Bootstrap all necessary settings and values',
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    /*
      We have the following scenarios:
      1. chart install: assume empty env dir, so git init > bootstrap values (=load skeleton files, then merge chart values) > and commit
      2. cli install: first time, so git init > bootstrap values
      3. cli install: n-th time (.git exists), so pull > bootstrap values
    */
    await bootstrapGit()
    await bootstrapValues()
  },
}
export default module
