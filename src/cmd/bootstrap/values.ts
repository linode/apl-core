import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { copy } from 'fs-extra'
import { copyFile } from 'fs/promises'
import { Argv } from 'yargs'
import { OtomiDebugger, terminal } from '../../common/debug'
import { env } from '../../common/envalid'
import { cleanupHandler, otomi } from '../../common/setup'
import { BasicArguments, currDir, getFilename, loadYaml, setParsedArgs } from '../../common/utils'
import { genSops } from '../gen-sops'
import { merge } from './lib/chart'

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

export type Arguments = BasicArguments

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = (argv: Arguments): void => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)
}

const rollBack = (): void => {
  const dirContent = readdirSync(env.ENV_DIR)
  dirContent.map((item) => rmSync(item, { recursive: true, force: true }))
}

const generateLooseSchema = (currDirVal: string) => {
  const schemaPath = '.vscode/values-schema.yaml'
  const targetPath = `${env.ENV_DIR}/${schemaPath}`
  const sourcePath = `${currDirVal}/values-schema.yaml`

  const valuesSchema = loadYaml(sourcePath)
  const trimmedVS = JSON.stringify(valuesSchema, (k, v) => (k === 'required' ? undefined : v), 2)
  writeFileSync(targetPath, trimmedVS)
  if (currDirVal !== '/home/app/stack' && !existsSync(`${currDirVal}/${schemaPath}`))
    writeFileSync(`${currDirVal}/.values/values-schema.yaml`, trimmedVS)
  debug.info(`Stored YAML schema at: ${targetPath}`)
}

export const bootstrapValues = async (argv: Arguments): Promise<void> => {
  const args = { ...argv }
  setup(args)

  const currDirVal = await currDir()

  const secretsFile = `${env.ENV_DIR}/.secrets`
  const hasOtomi = existsSync(`${env.ENV_DIR}/bin/otomi`)

  const binPath = `${env.ENV_DIR}/bin`
  mkdirSync(binPath, { recursive: true })
  const otomiImage = `otomi/core:${otomi.imageTag()}`
  debug.info(`Intalling artifacts from ${otomiImage}`)

  await Promise.allSettled([
    copyFile(`${currDirVal}/bin/aliases`, `${binPath}/aliases`),
    copyFile(`${currDirVal}/binzx/otomi`, `${binPath}/otomi`),
  ])
  debug.info('Copied bin files')
  debug.info(currDirVal)
  try {
    mkdirSync(`${env.ENV_DIR}/.vscode`, { recursive: true })
    await copy(`${currDirVal}/.values/.vscode`, `${env.ENV_DIR}/.vscode`, { overwrite: false, recursive: true })
    debug.info('Copied vscode folder')
    generateLooseSchema(currDirVal)
    debug.info('Generated loose schema')
  } catch (error) {
    debug.error(error)
    debug.error(`Could not copy from ${currDirVal}/.values/.vscode`)
    process.exit(1)
  }

  await Promise.allSettled(
    ['.gitattributes', '.secrets.sample']
      .filter((val) => !existsSync(`${env.ENV_DIR}/${val.replace(/\.sample$/g, '')}`))
      .map(async (val) => copyFile(`${currDirVal}/.values/${val}`, `${env.ENV_DIR}/${val}`)),
  )

  await Promise.allSettled(
    ['.gitignore', '.prettierrc.yml', 'README.md'].map(async (val) =>
      copyFile(`${currDirVal}/.values/${val}`, `${env.ENV_DIR}/${val}`),
    ),
  )
  if (!existsSync(`${env.ENV_DIR}/env`)) {
    debug.log(`Copying basic values`)
    await copy(`${currDirVal}/.values/env`, `${env.ENV_DIR}/env`, { overwrite: false, recursive: true })
  }

  try {
    await genSops({ ...argv, dryRun: false }, { skipAllPreChecks: true })
  } catch (error) {
    debug.error(error.message)
  }
  if (env.GCLOUD_SERVICE_KEY) {
    writeFileSync(`${env.ENV_DIR}/gcp-key.json`, JSON.stringify(env.GCLOUD_SERVICE_KEY, null, 2))
  }

  debug.log('Copying Otomi Console Setup')
  mkdirSync(`${env.ENV_DIR}/docker-compose`, { recursive: true })
  await copy(`${currDirVal}/docker-compose`, `${env.ENV_DIR}/docker-compose`, { overwrite: true, recursive: true })
  await Promise.allSettled(
    ['core.yaml', 'docker-compose.yml'].map((val) => copyFile(`${currDirVal}/${val}`, `${env.ENV_DIR}/${val}`)),
  )

  // If we run from chart installer, VALUES_INPUT will be set
  if (process.env.VALUES_INPUT) await merge()

  if (!hasOtomi) {
    debug.log('You can now use the otomi CLI')
    debug.log('Start by sourcing aliases:')
    debug.log('. bin/aliases')
  }
  debug.log(`Done Bootstrapping`)
}

export const module = {
  command: cmdName,
  describe: "Bootstrap values repo with artifacts corresponding to the cluster's stack version",
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    const envDirHasVals = existsSync(env.ENV_DIR) && readdirSync(env.ENV_DIR).length > 0
    try {
      await bootstrapValues(argv)
    } catch (error) {
      debug.error('Error occurred, rolling back')
      if (!envDirHasVals) rollBack()
      debug.error(error)
      process.exit(1)
    }
  },
}

export default module
