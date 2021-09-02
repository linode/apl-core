import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { copy } from 'fs-extra'
import { copyFile } from 'fs/promises'
import { isEmpty } from 'lodash-es'
import { fileURLToPath } from 'url'
// import isURL from 'validator/es/lib/isURL'
import { Argv } from 'yargs'
import { $, cd, nothrow } from 'zx'
import { decrypt, encrypt } from '../common/crypt'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getImageTag, prepareEnvironment } from '../common/setup'
import {
  BasicArguments,
  flattenObject,
  generateSecrets,
  getFilename,
  getKubeSecret,
  loadYaml,
  OtomiDebugger,
  rootDir,
  setParsedArgs,
  terminal,
} from '../common/utils'
import { isChart, writeValues } from '../common/values'
import { genSops } from './gen-sops'
import { validateValues } from './validate-values'

export const getChartValues = (): Record<string, any> | undefined => {
  return loadYaml(env.VALUES_INPUT)
}

export type Arguments = BasicArguments

const cmdName = getFilename(import.meta.url)
const dirname = fileURLToPath(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)
const k8sPasswordName = 'otomi-generated-passwords'

const generateLooseSchema = () => {
  const devOnlyPath = `${rootDir}/.vscode/values-schema.yaml`
  const targetPath = `${env.ENV_DIR}/.vscode/values-schema.yaml`
  const sourcePath = `${rootDir}/values-schema.yaml`

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

export const bootstrapValues = async (): Promise<void> => {
  const hasOtomi = existsSync(`${env.ENV_DIR}/bin/otomi`)

  const binPath = `${env.ENV_DIR}/bin`
  mkdirSync(binPath, { recursive: true })
  const otomiImage = `otomi/core:${getImageTag()}`
  debug.info(`Intalling artifacts from ${otomiImage}`)

  await Promise.allSettled([
    copyFile(`${rootDir}/bin/aliases`, `${binPath}/aliases`),
    copyFile(`${rootDir}/binzx/otomi`, `${binPath}/otomi`),
  ])
  debug.info('Copied bin files')
  try {
    mkdirSync(`${env.ENV_DIR}/.vscode`, { recursive: true })
    await copy(`${rootDir}/.values/.vscode`, `${env.ENV_DIR}/.vscode`, { recursive: true })
    debug.info('Copied vscode folder')
  } catch (error) {
    debug.error(error)
    throw new Error(`Could not copy from ${rootDir}/.values/.vscode`)
  }

  generateLooseSchema()

  await Promise.allSettled(
    ['.secrets.sample']
      .filter((val) => !existsSync(`${env.ENV_DIR}/${val.replace(/\.sample$/g, '')}`))
      .map(async (val) => copyFile(`${rootDir}/.values/${val}`, `${env.ENV_DIR}/${val}`)),
  )

  await Promise.allSettled(
    ['.gitignore', '.prettierrc.yml', 'README.md'].map(async (val) =>
      copyFile(`${rootDir}/.values/${val}`, `${env.ENV_DIR}/${val}`),
    ),
  )
  if (!existsSync(`${env.ENV_DIR}/env`)) {
    debug.log(`Copying basic values`)
    await copy(`${rootDir}/.values/env`, `${env.ENV_DIR}/env`, { overwrite: false, recursive: true })
  }

  debug.log('Copying Otomi Console Setup')
  mkdirSync(`${env.ENV_DIR}/docker-compose`, { recursive: true })
  await copy(`${rootDir}/docker-compose`, `${env.ENV_DIR}/docker-compose`, { overwrite: true, recursive: true })
  await Promise.allSettled(
    ['core.yaml', 'docker-compose.yml'].map((val) => copyFile(`${rootDir}/${val}`, `${env.ENV_DIR}/${val}`)),
  )

  let originalValues: Record<string, any> = {}
  if (isChart) {
    // write chart values if we got any
    originalValues = getChartValues() as Record<string, any>
    await writeValues(originalValues)
  }

  await genSops()
  if (existsSync(`${env.ENV_DIR}/.sops.yaml`) && existsSync(`${env.ENV_DIR}/.secrets`)) {
    await encrypt()
    await decrypt()
  }

  if (!isChart) originalValues = await hfValues({ skipCache: true })

  // Generate passwords and merge with values and give the priority to the current existing passwords. (don't change passwords everytime)
  // If schema changes and some new secrets are added, running bootstrap will generate those new secrets as well.
  let generatedSecrets = await generateSecrets(originalValues)
  if (isChart) {
    const kubeSecretObject = await getKubeSecret(k8sPasswordName)
    debug.info('Checking if passwords already exist on cluster')
    debug.debug(kubeSecretObject)
    if (isEmpty(kubeSecretObject)) {
      debug.info('Creating secret on cluster as failover')
      const secretLiterals = Object.entries(flattenObject(generatedSecrets)).map(
        ([k, v]) => `--from-literal='${k}'='${v}'`,
      )
      await nothrow($`kubectl create secret generic ${k8sPasswordName} ${secretLiterals}`)
    } else {
      debug.debug('Found secrets on cluster, recovering')
      generatedSecrets = kubeSecretObject
    }
  }
  await writeValues(generatedSecrets, false)

  try {
    if (!isEmpty(originalValues)) await validateValues()
  } catch (error) {
    debug.error(error)
    throw new Error('Tried to bootstrap with invalid values. Please update your values and try again.')
  }
  // if we did not have the admin password before we know we have generated it for the first time
  // so tell the user about it
  if (!originalValues?.otomi?.adminPassword) {
    debug.log(
      '`otomi.adminPassword` has been generated and is stored in the values repository in `env/secrets.settings.yaml`',
    )
  }
  if (isChart) {
    // Write some output for the user about password access via a secret
    const updatedValues = await hfValues({ skipCache: true })

    await nothrow($`kubectl delete secret generic otomi-password &>/dev/null`)
    await nothrow(
      $`kubectl create secret generic otomi-password --from-literal='admin'='${updatedValues.otomi.adminPassword}'`,
    )
    debug.log(
      'A kubernetes secret has been created in the `default` namespace called `otomi-password` which contains the `otomi.adminPassword`. You should know what to do with it ;)',
    )
  }

  if (existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    // encryption related stuff
    const file = '.gitattributes'
    await copyFile(`${rootDir}/.values/${file}`, `${env.ENV_DIR}/${file}`)
    // just call encrypt and let it sort out what has changed and needs encrypting
    await encrypt()
  }

  if (!hasOtomi) {
    debug.log('You can now use the otomi CLI')
  }
  debug.log(`Done bootstrapping values`)
}

export const bootstrapGit = async (): Promise<void> => {
  if (existsSync(`${env.ENV_DIR}/.git`)) {
    // scenario 3: pull > bootstrap values
    debug.info('Values repo already git initialized.')
  } else {
    // scenario 1 or 2 or 4(2 will only be called upon first otomi commit)
    debug.info('Initializing values repo.')
    cd(env.ENV_DIR)

    const values = await hfValues({ skipCache: true })

    await $`git init ${env.ENV_DIR}`
    copyFileSync(`bin/hooks/pre-commit`, `${env.ENV_DIR}/.git/hooks/pre-commit`)

    // const stage = values?.charts?.['cert-manager']?.stage ?? 'production'
    // if (stage === 'staging') process.env.GIT_SSL_NO_VERIFY = 'true'

    const giteaEnabled = values?.charts?.gitea?.enabled ?? true
    const clusterDomain = values?.cluster?.domainSuffix
    const byor = !!values?.charts?.['otomi-api']?.git

    if (!byor && !clusterDomain) {
      debug.info('Skipping git repo configuration')
      return
    }

    if (!giteaEnabled && !byor) {
      throw new Error('Gitea was disabled but no charts.otomi-api.git config was given.')
    } else if (!clusterDomain) {
      debug.info('No values defined for git. Skipping git repository configuration')
      return
    }
    let username = 'Otomi Admin'
    let email: string
    let password: string
    let remote: string
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
    if (existsSync(`${env.ENV_DIR}/.sops.yaml`)) await nothrow($`git config --local diff.sopsdiffer.textconv "sops -d"`)

    cd(rootDir)
    debug.log(`Done bootstrapping git`)
  }
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
      4. chart install: n-th time. (values are stored in some git repository), so configure git, then clone values, then merge chart values) > and commit

    */
    await bootstrapValues()
    await decrypt()
    await bootstrapGit()
  },
}
export default module
