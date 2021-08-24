import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { copy } from 'fs-extra'
import { copyFile } from 'fs/promises'
import { fileURLToPath } from 'url'
// import isURL from 'validator/es/lib/isURL'
import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { decrypt, encrypt } from '../common/crypt'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getImageTag, prepareEnvironment } from '../common/setup'
import { BasicArguments, currDir, getFilename, loadYaml, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { genSops } from './gen-sops'
import { mergeChartValues } from './lib/chart'

export type Arguments = BasicArguments

const cmdName = getFilename(import.meta.url)
const dirname = fileURLToPath(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

const generateLooseSchema = (cwd: string) => {
  const devOnlyPath = `${cwd}/.vscode/values-schema.yaml`
  const targetPath = `${env.ENV_DIR}/.vscode/values-schema.yaml`
  const sourcePath = `${cwd}/values-schema.yaml`

  const valuesSchema = loadYaml(sourcePath)
  const trimmedVS = JSON.stringify(valuesSchema, (k, v) => (k === 'required' ? undefined : v), 2)
  writeFileSync(targetPath, trimmedVS)
  debug.info(`Stored loose YAML schema at: ${targetPath}`)
  if (dirname.includes('otomi-core')) {
    // for validation of .values/env/* files we also generate a loose schema here:
    writeFileSync(devOnlyPath, trimmedVS)
    debug.debug(`Stored loose YAML schema for otomi-core devs at: ${devOnlyPath}`)
  }
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

    let values: any
    if (env.VALUES_INPUT) {
      values = loadYaml(env.VALUES_INPUT)
    } else if (existsSync(`${env.ENV_DIR}/env/cluster.yaml`)) {
      // TODO: Make else once defaults are removed from defaults.gotmpl
      const clstr = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)
      if (!clstr.provider) {
        debug.info('Skipping git repo configuration')
        return
      }
      values = await hfValues()
    }
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
    } else if (!clusterDomain) {
      debug.info('No values defined for git. Skipping git repository configuration')
      return
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
  try {
    mkdirSync(`${env.ENV_DIR}/.vscode`, { recursive: true })
    await copy(`${cwd}/.values/.vscode`, `${env.ENV_DIR}/.vscode`, { recursive: true })
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
  }

  debug.log('Copying Otomi Console Setup')
  mkdirSync(`${env.ENV_DIR}/docker-compose`, { recursive: true })
  await copy(`${cwd}/docker-compose`, `${env.ENV_DIR}/docker-compose`, { overwrite: true, recursive: true })
  await Promise.allSettled(
    ['core.yaml', 'docker-compose.yml'].map((val) => copyFile(`${cwd}/${val}`, `${env.ENV_DIR}/${val}`)),
  )

  // If we run from chart installer, VALUES_INPUT will be set
  if (env.VALUES_INPUT) await mergeChartValues()
  // TODO: Enable wizard
  // else if (process.stdout.isTTY) {
  //   await askBasicQuestions()
  // }

  await genSops()

  if (existsSync(`${env.ENV_DIR}/.sops.yaml`)) await encrypt()

  if (!hasOtomi) {
    debug.log('You can now use the otomi CLI')
  }
  debug.log(`Done bootstrapping values`)
}

// const notEmpty = (answer: string): boolean => answer?.trim().length > 0

// export const askBasicQuestions = async (): Promise<void> => {
//   // TODO: If running this function later (when values exists) then skip questions for which the value exists
//   // TODO: Parse the value schema and get defaults!
//   const bootstrapWithMinimalValues = await askYesNo(
//     'To get the full otomi experience we need to get some cluster information to bootstrap the minimal viable values, do you wish to continue?',
//     { defaultYes: true },
//   )
//   if (!bootstrapWithMinimalValues) return
//   const values: any = {}

//   console.log('First few questions will be about the cluster')
//   values.cluster = {}
//   values.cluster.owner = await ask('Who is the owner of this cluster?', { matchingFn: notEmpty })
//   values.cluster.name = await ask('What is the name of this cluster?', { matchingFn: notEmpty })
//   values.cluster.domainSuffix = await ask('What is the domain suffix of this cluster?', {
//     matchingFn: (a: string) => notEmpty(a) && isURL(a),
//   })
//   values.cluster.k8sVersion = await ask('What is the kubernetes version of this cluster?', {
//     matchingFn: notEmpty,
//     defaultAnswer: '1.19',
//   })
//   values.cluster.apiServer = await ask('What is the api server of this cluster?', {
//     matchingFn: (a: string) => notEmpty(a) && isURL(a),
//   })
//   console.log('What provider is this cluster running on?')
//   values.cluster.provider = await cliSelect({
//     values: ['aws', 'azure', 'google'],
//     valueRenderer: (value, selected) => {
//       return selected ? chalk.underline(value) : value
//     },
//   })
//   values.cluster.region = await ask('What is the region of the provider where this cluster is running?', {
//     matchingFn: notEmpty,
//   })

//   console.log('='.repeat(15))
//   console.log('Next a few questions about otomi')
//   values.otomi = {}
//   values.otomi.version = await ask('What version of otomi do you want to run?', {
//     matchingFn: notEmpty,
//     defaultAnswer: 'master',
//   })
//   // values.otomi.adminPassword = await ask('What is the admin password for otomi (leave blank to generate)', {defaultAnswer: })

//   // const useGitea = await askYesNo('Do you want to store the values on the cluster?', { defaultYes: true })
//   // if (useGitea) {
//   //   // Write to env/chart/gitea.yaml: enabled = true
//   // } else {
//   //   console.log('We need to get credentials where to store the values')
//   //   const repo = await ask('What is the repository url', {
//   //     matchingFn: async (answer: string) => {
//   //       const res = (await nothrow($`git ls-remote ${answer}`)).exitCode === 0
//   //       if (!res) console.log("It's an invalid repository, please try again.")
//   //       return res
//   //     },
//   //   })
//   //   const username = await ask('What is the repository username', {
//   //     matchingFn: notEmpty,
//   //   })
//   //   const password = await ask('What is the repository password', {
//   //     matchingFn: notEmpty,
//   //   })
//   //   const email = await ask('What is the repository email', {
//   //     matchingFn: (answer: string) => isEmail(answer),
//   //   })
//   // }
//   // console.log(
//   //   'Please select your KMS provider for encryption. Select "none" to disable encryption. (We strongly suggest you only skip encryption for testing purposes.)',
//   // )
//   // const sopsProvider = await cliSelect({ values: ['none', 'aws', 'azure', 'google', 'vault'], defaultValue: 'none' })
//   // const clusterName = await ask('What is the cluster name?', {
//   //   matchingFn: notEmpty,
//   // })
//   // const clusterDomain = await ask('What is the cluster domain?', {
//   //   matchingFn: (answer: string) => notEmpty(answer) && isURL(answer.trim()),
//   // })
// }

export const module = {
  command: cmdName,
  hidden: true,
  describe: 'Bootstrap all necessary settings and values',
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    /*
      We have the following scenarios:
      1. chart install: assume empty env dir, so git init > bootstrap values (=load skeleton files, then merge chart values) > and commit
      2. cli install: first time, so git init > bootstrap values
      3. cli install: n-th time (.git exists), so pull > bootstrap values
    */
    await bootstrapValues()
    await decrypt()
    await bootstrapGit()
  },
}
export default module
