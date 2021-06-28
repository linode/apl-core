import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs'
import { copyFile } from 'fs/promises'
import { load } from 'js-yaml'
import { Argv } from 'yargs'
import { $ } from 'zx'
import { ask, BasicArguments, cleanupHandler, ENV, otomi, OtomiDebugger, terminal } from '../common/index'

const fileName = 'bootstrap'
let debug: OtomiDebugger
const profileOptions = readdirSync('profiles').filter((val) => val !== 'common')

export interface Arguments extends BasicArguments {
  profile: string
  p: string
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

const generateLooseSchema = (currDir: string) => {
  const targetPath = `${ENV.DIR}/.vscode/values-schema.yaml`
  const sourcePath = `${currDir}/values-schema.yaml`

  const valuesSchema = load(sourcePath) as any
  const trimmedVS = JSON.parse(JSON.stringify(valuesSchema, (k, v) => (k === 'required' ? undefined : v)))
  writeFileSync(targetPath, trimmedVS)
  if (currDir !== '/home/app/stack') writeFileSync(`${currDir}/.values/values-schema.yaml`, trimmedVS)
  debug.verbose(`Stored YAML schema at: ${targetPath}`)
}

export const bootstrap = async (argv: Arguments): Promise<void> => {
  const args = { ...argv }
  setup(args)

  process.env.PROFILE =
    args.profile ??
    process.env.PROFILE ??
    (await ask(
      `-p|--profile argument was not supplied and PROFILE environment variable was not set, what profile do you want to bootstrap? [${profileOptions.join(
        ', ',
      )}]`,
      { choices: profileOptions, matching: profileOptions },
    ))
  args.p = process.env.PROFILE
  args.profile = process.env.PROFILE

  const currDir = (await $`pwd`).stdout.trim()

  const secretsFile = `${ENV.DIR}/.secrets`
  const hasOtomi = existsSync(`${ENV.DIR}/bin/otomi`)

  const binPath = `${ENV.DIR}/bin`
  mkdirSync(binPath, { recursive: true })
  const otomiImage = `otomi/core:${otomi.imageTag()}`
  debug.verbose(`Intalling artifacts from ${otomiImage}`)

  await Promise.allSettled([
    copyFile(`${currDir}/bin/aliases`, `${binPath}/aliases`),
    copyFile(`${currDir}/binzx/otomi`, `${binPath}/otomi`),
  ])
  debug.verbose('Copied bin files')
  debug.verbose(currDir)
  try {
    await $`cp -r ${currDir}/.values/.vscode ${ENV.DIR}/`
    debug.verbose('Copied vscode folder')
    generateLooseSchema(currDir)
    debug.verbose('Generated loose schema')
  } catch (error) {
    debug.error(error)
    debug.exit(1, `Could not copy from ${currDir}/.values/.vscode`)
  }

  await Promise.allSettled(
    ['.gitattributes', '.sops.yaml.sample', '.secrets.sample']
      .filter((val) => !existsSync(`${ENV.DIR}/${val.replace(/\.sample$/g, '')}`))
      .map(async (val) => copyFile(`${currDir}/.values/${val}`, `${ENV.DIR}/${val}`)),
  )

  await Promise.allSettled(
    ['.gitignore', '.prettierrc.yml', 'README.md'].map(async (val) =>
      copyFile(`${currDir}/.values/${val}`, `${ENV.DIR}/${val}`),
    ),
  )

  debug.log(`No files found in "${ENV.DIR}/env". Installing example files from profile ${args.profile}`)
  await $`cp -r ${currDir}/profiles/commonenv ${ENV.DIR}`
  await $`cp -r ${currDir}/profiles/${args.profile}/env ${ENV.DIR}`

  await $`git init ${ENV.DIR}`
  copyFileSync(`${currDir}/bin/hooks/pre-commit`, `${ENV.DIR}/.git/hooks/pre-commit`)
  if (process.env.GCLOUD_SERVICE_KEY?.length) {
    writeFileSync(`${ENV.DIR}/gcp-key.json`, JSON.stringify(JSON.parse(process.env.GCLOUD_SERVICE_KEY), null, 2))
  }

  const secretsFileEnv = `${ENV.DIR}/env/secrets.settings.yamls`
  if (existsSync(secretsFile)) {
    const secretsContent = load(secretsFileEnv) as any
    if (secretsContent?.otomi?.pullSecret?.length) {
      debug.log('Copying Otomi Console Setup')
      await $`cp -rf ${currDir}/docker-compose ${ENV.DIR}/`
      await Promise.allSettled(
        ['core.yaml', 'docker-compose.yml'].map((val) => copyFile(`${currDir}/${val}`, `${ENV.DIR}/${val}`)),
      )
    }
  }
  if (!hasOtomi) {
    debug.log('You can now use the otomi CLI')
    debug.log('Start by sourcing aliases:')
    debug.log('. bin/aliases')
  }
  debug.log(`Done Bootstrapping ${args.profile}`)
}

export const module = {
  command: fileName,
  describe: "Bootstrap values repo with artifacts corresponding to the cluster's stack version",
  builder: (parser: Argv): Argv =>
    parser.options({
      profile: {
        alias: ['p'],
        describe: 'Bootstrap selected profile',
        group: 'otomi bootstrap options',
        choices: profileOptions,
        string: true,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    try {
      await bootstrap(argv)
    } catch (error) {
      debug.exit(1, error)
    }
  },
}

export default module
