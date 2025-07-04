import { randomUUID } from 'crypto'
import { copy, pathExists } from 'fs-extra'
import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import { generate as generatePassword } from 'generate-password'
import { cloneDeep, get, isEmpty, merge, set } from 'lodash'
import { pki } from 'node-forge'
import path from 'path'
import { bootstrapGit } from 'src/common/bootstrap'
import { prepareEnvironment } from 'src/common/cli'
import { DEPLOYMENT_PASSWORDS_SECRET } from 'src/common/constants'
import { decrypt, encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { env, isChart, isCi, isCli } from 'src/common/envalid'
import { hfValues } from 'src/common/hf'
import { createK8sSecret, getDeploymentState, getK8sSecret, secretId } from 'src/common/k8s'
import { getKmsSettings } from 'src/common/repo'
import { ensureTeamGitOpsDirectories, getFilename, gucci, isCore, loadYaml, rootDir } from 'src/common/utils'
import { generateSecrets, getCurrentVersion, getImageTag, writeValues } from 'src/common/values'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $ } from 'zx'
import { migrate } from './migrate'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

const kmsMap = {
  aws: 'kms',
  azure: 'azure_keyvault',
  google: 'gcp_kms',
  age: 'age',
}

export const bootstrapSops = async (
  envDir = env.ENV_DIR,
  deps = {
    copyFile,
    decrypt,
    encrypt,
    gucci,
    loadYaml,
    pathExists,
    getKmsSettings,
    readFile,
    terminal,
    writeFile,
  },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:genSops`)
  const targetPath = `${envDir}/.sops.yaml`
  const values = await deps.getKmsSettings(envDir)

  const provider: string | undefined = values?.kms?.sops?.provider
  if (!provider) {
    d.warn('No sops information given. Assuming no sops enc/decryption needed. Be careful!')
    return
  }

  const templatePath = `${rootDir}/tpl/.sops.yaml.gotmpl`
  const kmsProvider = kmsMap[provider] as string
  const kmsKeys = values.kms.sops[provider]?.keys as string

  const obj = {
    provider: kmsProvider,
    keys: kmsKeys,
  }

  if (provider === 'age') {
    const { publicKey } = values?.kms?.sops?.age ?? {}
    let privateKey = values.kms?.sops?.age?.privateKey
    if (privateKey.startsWith('ENC')) {
      privateKey = ''
    }
    obj.keys = publicKey
    if (privateKey && !process.env.SOPS_AGE_KEY) {
      process.env.SOPS_AGE_KEY = privateKey
      await deps.writeFile(`${envDir}/.secrets`, `SOPS_AGE_KEY=${privateKey}`)
    }
  }

  const exists = await deps.pathExists(targetPath)
  d.log(`Creating sops file for provider ${provider}`)
  const output = (await deps.gucci(templatePath, obj, true)) as string
  await deps.writeFile(targetPath, output)
  d.log(`Ready generating sops files. The configuration is written to: ${targetPath}`)

  d.info('Copying sops related files')
  // add sops related files
  const file = '.gitattributes'
  await deps.copyFile(`${rootDir}/.values/${file}`, `${envDir}/${file}`)

  // prepare some credential files the first time and crypt some
  if (!exists) {
    if (isCli || env.OTOMI_DEV) {
      // first time so we know we have values
      const secretsFile = `${envDir}/.secrets`
      d.log(`Creating secrets file: ${secretsFile}`)
      if (provider === 'google') {
        // and we also assume the correct values are given by using '!' (we want to err when not set)
        const serviceKeyJson = JSON.parse(values.kms.sops!.google!.accountJson as string)
        // and set it in env for later decryption
        process.env.GCLOUD_SERVICE_KEY = values.kms.sops!.google!.accountJson
        d.log('Creating gcp-key.json for vscode.')
        await deps.writeFile(`${envDir}/gcp-key.json`, JSON.stringify(serviceKeyJson))
        d.log(`Creating credentials file: ${secretsFile}`)
        await deps.writeFile(secretsFile, `GCLOUD_SERVICE_KEY=${JSON.stringify(JSON.stringify(serviceKeyJson))}`)
      } else if (provider === 'aws') {
        const v = values.kms.sops!.aws!
        await deps.writeFile(secretsFile, `AWS_ACCESS_KEY_ID='${v.accessKey}'\nAWS_ACCESS_KEY_SECRET=${v.secretKey}`)
      } else if (provider === 'azure') {
        const v = values.kms.sops!.azure!
        await deps.writeFile(secretsFile, `AZURE_CLIENT_ID='${v.clientId}'\nAZURE_CLIENT_SECRET=${v.clientSecret}`)
      } else if (provider === 'age') {
        const { privateKey } = values.kms.sops!.age!
        process.env.SOPS_AGE_KEY = privateKey
        await deps.writeFile(secretsFile, `SOPS_AGE_KEY=${privateKey}`)
      }
    }
    // now do a round of encryption and decryption to make sure we have all the files in place for later
    await deps.encrypt(envDir)
    await deps.decrypt(envDir)
  }
}

export const copySchema = async (deps = { terminal, rootDir, env, isCore, loadYaml, copyFile }): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:copySchema`)
  const { ENV_DIR } = env
  const devOnlyPath = `${deps.rootDir}/.vscode/values-schema.yaml`
  const targetPath = `${ENV_DIR}/.vscode/values-schema.yaml`
  const sourcePath = `${deps.rootDir}/values-schema.yaml`

  await deps.copyFile(sourcePath, targetPath)
  d.info(`Stored loose YAML schema at: ${targetPath}`)
  if (deps.isCore) {
    // for validation of .values/env/* files we also generate a schema here:
    // deps.outputFile(devOnlyPath, trimmedVS)
    await deps.copyFile(sourcePath, devOnlyPath)
    d.debug(`Stored loose YAML schema for apl-core devs at: ${devOnlyPath}`)
  }
}

export const getStoredClusterSecrets = async (
  deps = { $, terminal, getK8sSecret },
): Promise<Record<string, any> | undefined> => {
  const d = deps.terminal(`cmd:${cmdName}:getStoredClusterSecrets`)
  d.info(`Checking if ${secretId} already pathExists`)
  if (env.isDev && env.DISABLE_SYNC) return undefined
  // we might need to create the 'otomi' namespace if we are in CLI mode
  if (isCli) await deps.$`kubectl create ns otomi &> /dev/null`.nothrow().quiet()
  const kubeSecretObject = await deps.getK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, 'otomi')
  if (kubeSecretObject) {
    d.info(`Found ${secretId} secrets on cluster, recovering`)
    return kubeSecretObject
  }
  return undefined
}

export const generateAgeKeys = async (deps = { $, terminal }) => {
  const d = deps.terminal(`cmd:${cmdName}:generateAgeKeys`)
  try {
    d.info('Generating age keys')
    const result = await deps.$`age-keygen`
    const { stdout } = result
    const matchPublic = stdout?.match(/age[0-9a-z]+/)
    const publicKey = matchPublic ? matchPublic[0] : ''
    const matchPrivate = stdout?.match(/AGE-SECRET-KEY-[0-9A-Z]+/)
    const privateKey = matchPrivate ? matchPrivate[0] : ''
    const ageKeys = { publicKey, privateKey }
    return ageKeys
  } catch (error) {
    d.log('Error generating age keys:', error)
    throw error
  }
}

export const getKmsValues = async (values: Record<string, any>, deps = { generateAgeKeys }) => {
  const kms = values?.kms
  if (!kms) return undefined
  const provider = kms?.sops?.provider
  if (!provider) return {}
  if (provider !== 'age') return { kms }
  const age = kms?.sops?.age
  if (age?.publicKey && age?.privateKey) return { kms }
  const ageKeys = await deps.generateAgeKeys()
  return { kms: { sops: { provider: 'age', age: ageKeys } } }
}

export const addPlatformAdmin = (users: any[], domainSuffix: string) => {
  const defaultPlatformAdminEmail = `platform-admin@${domainSuffix}`
  const platformAdminExists = users.find((user) => user.email === defaultPlatformAdminEmail)
  if (platformAdminExists) return
  const platformAdmin = {
    email: defaultPlatformAdminEmail,
    firstName: 'platform',
    lastName: 'admin',
    isPlatformAdmin: true,
    isTeamAdmin: false,
    teams: [],
  }
  users.push(platformAdmin)
}

export const addInitialPasswords = (users: any[], deps = { generatePassword }) => {
  for (const user of users) {
    if (!user.initialPassword) {
      user.initialPassword = deps.generatePassword({
        length: 20,
        numbers: true,
        symbols: '!@#$%&*',
        lowercase: true,
        uppercase: true,
        strict: true,
      })
    }
  }
}

export const getUsers = (originalInput: any, deps = { generatePassword, addInitialPasswords, addPlatformAdmin }) => {
  const users = get(originalInput, 'users', []) as any[]
  const { hasExternalIDP } = get(originalInput, 'otomi', {})
  if (!hasExternalIDP) {
    const { domainSuffix }: { domainSuffix: string } = get(originalInput, 'cluster', {})
    deps.addPlatformAdmin(users, domainSuffix)
  }
  deps.addInitialPasswords(users)
  users.forEach((user) => {
    set(user, 'name', user.name || randomUUID())
  })
  return users
}

export const copyBasicFiles = async (
  deps = { copy, copyFile, copySchema, mkdir, pathExists, terminal },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:copyBasicFiles`)
  const { ENV_DIR } = env
  const binPath = `${ENV_DIR}/bin`
  await deps.mkdir(binPath, { recursive: true })
  await Promise.allSettled([
    deps.copyFile(`${rootDir}/bin/aliases`, `${binPath}/aliases`),
    deps.copyFile(`${rootDir}/binzx/otomi`, `${binPath}/otomi`),
  ])
  d.info('Copied bin files')
  await deps.mkdir(`${ENV_DIR}/.vscode`, { recursive: true })
  await deps.copy(`${rootDir}/.values/.vscode`, `${ENV_DIR}/.vscode`)
  d.info('Copied vscode folder')

  await deps.copySchema()

  // only copy sample files if a real one is not found
  await Promise.allSettled(
    ['.secrets.sample']
      .filter(async (val) => !(await deps.pathExists(`${ENV_DIR}/${val.replace(/\.sample$/g, '')}`)))
      .map(async (val) => deps.copyFile(`${rootDir}/.values/${val}`, `${ENV_DIR}/${val}`)),
  )

  // force copy all these
  await Promise.allSettled(
    ['.gitignore', '.prettierrc.yml', 'README.md'].map(async (val) =>
      deps.copyFile(`${rootDir}/.values/${val}`, `${ENV_DIR}/${val}`),
    ),
  )

  // copy these files from core
  await Promise.allSettled(['core.yaml'].map((val) => deps.copyFile(`${rootDir}/${val}`, `${ENV_DIR}/${val}`)))
}

// retrieves input values from either VALUES_INPUT or ENV_DIR
// and creates missing secrets as well (and stores them in a secret in app mode)
export const processValues = async (
  deps = {
    terminal,
    isChart,
    loadYaml,
    decrypt,
    getStoredClusterSecrets,
    getKmsValues,
    writeValues,
    pathExists,
    hfValues,
    validateValues,
    generateSecrets,
    createK8sSecret,
    createCustomCA,
    getUsers,
    generatePassword,
    addInitialPasswords,
    addPlatformAdmin,
  },
): Promise<Record<string, any> | undefined> => {
  const d = deps.terminal(`cmd:${cmdName}:processValues`)
  const { ENV_DIR, VALUES_INPUT } = env
  let originalInput: Record<string, any> = {}
  let storedSecrets: Record<string, any> | undefined
  if (deps.isChart) {
    d.log(`Loading app values from ${VALUES_INPUT}`)
    const originalValues = (await deps.loadYaml(VALUES_INPUT)) as Record<string, any>
    storedSecrets = (await deps.getStoredClusterSecrets()) || {}
    originalInput = merge(cloneDeep(storedSecrets || {}), cloneDeep(originalValues))
  } else {
    d.log(`Loading repo values from ${ENV_DIR}`)
    // we can only read values from ENV_DIR if we can determine cluster.providers
    storedSecrets = {}
    if (await deps.pathExists(`${ENV_DIR}/env/settings/cluster.yaml`)) {
      await deps.decrypt()
      originalInput = (await deps.hfValues({ defaultValues: true })) || {}
    }
  }
  // generate all secrets (does not diff against previous so generates all new secrets every time)
  const generatedSecrets = await deps.generateSecrets(originalInput)
  // do we need to create a custom CA? if so add it to the secrets
  const cm = get(originalInput, 'apps.cert-manager', {})
  let caSecrets = {}
  if (cm.customRootCA && cm.customRootCAKey) {
    d.info('Skipping custom RootCA generation')
  } else {
    caSecrets = deps.createCustomCA()
  }
  // get any kms values & generate age keys if needed
  const kmsValues = (await deps.getKmsValues(originalInput)) || {}
  // merge existing secrets over newly generated ones to keep them
  const allSecrets = merge(
    cloneDeep(caSecrets),
    cloneDeep(storedSecrets),
    cloneDeep(generatedSecrets),
    cloneDeep(kmsValues),
  )
  // add default platform admin & generate initial passwords for users if they don't have one
  const users = deps.getUsers(originalInput)
  // we have generated all we need, now store everything by merging the original values over all the secrets
  await deps.writeValues(merge(cloneDeep(allSecrets), cloneDeep(originalInput), cloneDeep({ users })))
  // and do some context dependent post processing:
  if (deps.isChart) {
    // to support potential failing chart install we store secrets on cluster
    if (!(env.isDev && env.DISABLE_SYNC)) await deps.createK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, 'otomi', allSecrets)
  } else if (!isEmpty(originalInput)) {
    // cli: when we are bootstrapping from a non empty values repo, validate the input
    await deps.validateValues()
    // Ensure newly generated secrets stored in .dec file are encrypted
    await encrypt()
  }
  return originalInput
}

// create file structure based on file entry
export const handleFileEntry = async (
  deps = {
    isChart,
    loadYaml,
    mkdir,
    terminal,
    writeFile,
  },
) => {
  const { ENV_DIR, VALUES_INPUT } = env
  if (deps.isChart) {
    // write Values from File
    const originalValues = (await deps.loadYaml(VALUES_INPUT)) as Record<string, any>
    if (originalValues && originalValues.files) {
      for (const [key, value] of Object.entries(originalValues.files as string)) {
        // extract folder name
        const filePath = path.dirname(key)
        // evaluate absolute file name and path
        const absPath = `${ENV_DIR}/${filePath}`
        const absFileName = `${ENV_DIR}/${key}`
        // create Folder
        await deps.mkdir(absPath, { recursive: true })
        // write File
        await deps.writeFile(absFileName, value.toString())
      }
    }
  }
}

/**
 * Creates a custom CA cert and key pair in the location as defined in the schema.
 */
export const createCustomCA = (deps = { terminal, pki, writeValues }): Record<string, any> => {
  const d = deps.terminal('createCustomCA')
  d.info('Generating custom root CA')

  // Code example from: https://www.npmjs.com/package/node-forge#x509
  const keys = deps.pki.rsa.generateKeyPair(2048)
  const cert = deps.pki.createCertificate()
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
  ])
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10)
  const attrs = [
    { name: 'countryName', value: 'NL' },
    { shortName: 'ST', value: 'Utrecht' },
    { name: 'localityName', value: 'Utrecht' },
    { name: 'organizationName', value: 'Otomi' },
    { shortName: 'OU', value: 'Development' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey)

  d.info('Generated CA key pair')
  // The yaml.dump function does not create multiline value on \r\n. Only on \n
  const rootCrt = deps.pki.certificateToPem(cert).replaceAll('\r\n', '\n')
  const rootKey = deps.pki.privateKeyToPem(keys.privateKey).replaceAll('\r\n', '\n')

  return {
    apps: {
      'cert-manager': {
        customRootCA: rootCrt,
        customRootCAKey: rootKey,
      },
    },
  }
}

export const bootstrap = async (
  deps = {
    pathExists,
    getDeploymentState,
    getImageTag,
    getCurrentVersion,
    terminal,
    copyBasicFiles,
    processValues,
    hfValues,
    isCli,
    writeValues,
    bootstrapSops,
    copyFile,
    migrate,
    encrypt,
    decrypt,
    handleFileEntry,
  },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:bootstrap`)

  // if CI: we are called from pipeline on each deployment, which is costly
  // so run bootstrap only when no previous deployment was done or version or tag of otomi changed
  const tag = await deps.getImageTag()
  const version = await deps.getCurrentVersion()
  if (isCi) {
    const { version: prevVersion, tag: prevTag } = await deps.getDeploymentState()
    if (prevVersion && prevTag && version === prevVersion && tag === prevTag) return
  }
  const { ENV_DIR } = env
  const hasOtomi = await deps.pathExists(`${ENV_DIR}/bin/otomi`)

  const otomiImage = `linode/apl-core:${tag}`
  d.log(`Installing artifacts from ${otomiImage}`)
  await deps.copyBasicFiles()
  await deps.migrate()
  const originalValues = await deps.processValues()
  // exit early if `isCli` and `ENV_DIR` were empty, and let the user provide valid values first:

  if (!originalValues) {
    // FIXME what is the use case to enter this
    d.log('A new values repo has been created. For next steps follow documentation at https://apl-docs.net')
    return
  }

  await deps.handleFileEntry()
  await deps.bootstrapSops()
  await ensureTeamGitOpsDirectories(ENV_DIR)
  if (!hasOtomi) {
    d.log('You can now use the otomi CLI')
  }
  d.log(`Done bootstrapping values`)
}

export const module = {
  command: cmdName,
  hidden: true,
  describe: 'Bootstrap all necessary settings and values',
  builder: (parser: Argv): Argv =>
    parser.options({
      destroy: {
        type: 'string',
        hidden: true,
        describe: 'Informs bootstrapper to check LB IP if no domainsuffix was found',
      },
    }),
  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await decrypt()
    await bootstrap()
    await bootstrapGit()
  },
}
