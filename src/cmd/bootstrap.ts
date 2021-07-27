import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { copy } from 'fs-extra'
import { copyFile } from 'fs/promises'
import { Argv } from 'yargs'
import { $ } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { BasicArguments, loadYaml, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi } from '../common/setup'
import { genSops } from './gen-sops'

const fileName = 'bootstrap'
let debug: OtomiDebugger

export type Arguments = BasicArguments

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = (argv: Arguments): void => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)
}

const rollBack = (): void => {
  const dirContent = readdirSync(env.ENV_DIR)
  dirContent.map((item) => rmSync(item, { recursive: true, force: true }))
}

const generateLooseSchema = (currDir: string) => {
  const schemaPath = '.vscode/values-schema.yaml'
  const targetPath = `${env.ENV_DIR}/${schemaPath}`
  const sourcePath = `${currDir}/values-schema.yaml`

  const valuesSchema = loadYaml(sourcePath)
  const trimmedVS = JSON.stringify(valuesSchema, (k, v) => (k === 'required' ? undefined : v), 2)
  writeFileSync(targetPath, trimmedVS)
  if (currDir !== '/home/app/stack' && !existsSync(`${currDir}/${schemaPath}`))
    writeFileSync(`${currDir}/.values/values-schema.yaml`, trimmedVS)
  debug.info(`Stored YAML schema at: ${targetPath}`)
}

export const bootstrap = async (argv: Arguments): Promise<void> => {
  const args = { ...argv }
  setup(args)

  const currDir = process.cwd()

  const secretsFile = `${env.ENV_DIR}/.secrets`
  const hasOtomi = existsSync(`${env.ENV_DIR}/bin/otomi`)

  const binPath = `${env.ENV_DIR}/bin`
  mkdirSync(binPath, { recursive: true })
  const otomiImage = `otomi/core:${otomi.imageTag()}`
  debug.info(`Intalling artifacts from ${otomiImage}`)

  await Promise.allSettled([
    copyFile(`${currDir}/bin/aliases`, `${binPath}/aliases`),
    copyFile(`${currDir}/binzx/otomi`, `${binPath}/otomi`),
  ])
  debug.info('Copied bin files')
  debug.info(currDir)
  try {
    mkdirSync(`${env.ENV_DIR}/.vscode`, { recursive: true })
    await copy(`${currDir}/.values/.vscode`, `${env.ENV_DIR}/.vscode`, { overwrite: false, recursive: true })
    debug.info('Copied vscode folder')
    generateLooseSchema(currDir)
    debug.info('Generated loose schema')
  } catch (error) {
    debug.error(error)
    debug.exit(1, `Could not copy from ${currDir}/.values/.vscode`)
  }

  await Promise.allSettled(
    ['.gitattributes', '.secrets.sample']
      .filter((val) => !existsSync(`${env.ENV_DIR}/${val.replace(/\.sample$/g, '')}`))
      .map(async (val) => copyFile(`${currDir}/.values/${val}`, `${env.ENV_DIR}/${val}`)),
  )

  await Promise.allSettled(
    ['.gitignore', '.prettierrc.yml', 'README.md'].map(async (val) =>
      copyFile(`${currDir}/.values/${val}`, `${env.ENV_DIR}/${val}`),
    ),
  )
  if (!existsSync(`${env.ENV_DIR}/env`)) {
    debug.log(`Copying basic values`)
    await copy(`${currDir}/.values/env`, env.ENV_DIR, { overwrite: false, recursive: true })
  }
  await $`git init ${env.ENV_DIR}`
  copyFileSync(`${currDir}/bin/hooks/pre-commit`, `${env.ENV_DIR}/.git/hooks/pre-commit`)

  try {
    await genSops({ ...argv, dryRun: false }, { skipAll: true })
  } catch (error) {
    debug.error(error.message)
  }
  if (env.GCLOUD_SERVICE_KEY) {
    writeFileSync(`${env.ENV_DIR}/gcp-key.json`, JSON.stringify(env.GCLOUD_SERVICE_KEY, null, 2))
  }

  const secretsFileEnv = `${env.ENV_DIR}/env/secrets.settings.yaml`
  if (existsSync(secretsFile)) {
    const secretsContent = loadYaml(secretsFileEnv)
    if (secretsContent?.otomi?.pullSecret?.length) {
      debug.log('Copying Otomi Console Setup')
      mkdirSync(`${env.ENV_DIR}/docker-compose`, { recursive: true })
      await copy(`${currDir}/docker-compose`, `${env.ENV_DIR}/docker-compose`, { overwrite: true, recursive: true })
      await Promise.allSettled(
        ['core.yaml', 'docker-compose.yml'].map((val) => copyFile(`${currDir}/${val}`, `${env.ENV_DIR}/${val}`)),
      )
    }
  }
  if (!hasOtomi) {
    debug.log('You can now use the otomi CLI')
    debug.log('Start by sourcing aliases:')
    debug.log('. bin/aliases')
  }
  debug.log(`Done Bootstrapping`)
}

export const module = {
  command: fileName,
  describe: "Bootstrap values repo with artifacts corresponding to the cluster's stack version",
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    const envDirHasVals = existsSync(env.ENV_DIR) && readdirSync(env.ENV_DIR).length > 0
    try {
      await bootstrap(argv)
    } catch (error) {
      debug.error('Error occurred, rolling back')
      if (!envDirHasVals) rollBack()
      debug.exit(1, error)
    }
  },
}

export default module
