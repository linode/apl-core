import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { copy } from 'fs-extra'
import { copyFile } from 'fs/promises'
import { cloneDeep, get, merge } from 'lodash'
import { pki } from 'node-forge'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { bootstrapGit } from '../common/bootstrap'
import { prepareEnvironment } from '../common/cli'
import { DEPLOYMENT_PASSWORDS_SECRET } from '../common/constants'
import { decrypt, encrypt } from '../common/crypt'
import { terminal } from '../common/debug'
import { env, isChart, isCi, isCli } from '../common/envalid'
import { hfValues } from '../common/hf'
import { createK8sSecret, getDeploymentState, getK8sSecret, secretId } from '../common/k8s'
import { getFilename, gucci, isCore, loadYaml, providerMap, rootDir } from '../common/utils'
import { generateSecrets, getCurrentVersion, getImageTag, writeValues } from '../common/values'
import { BasicArguments, setParsedArgs } from '../common/yargs'
import { migrate } from './migrate'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

const kmsMap = {
  aws: 'kms',
  azure: 'azure_keyvault',
  google: 'gcp_kms',
  vault: 'hc_vault_transit_uri',
}

export const bootstrapSops = async (
  deps = {
    terminal,
    loadYaml,
    copyFile,
    decrypt,
    encrypt,
    gucci,
    hfValues,
    existsSync,
    readFileSync,
    writeFileSync,
  },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:genSops`)
  const targetPath = `${env.ENV_DIR}/.sops.yaml`
  const settingsFile = `${env.ENV_DIR}/env/settings.yaml`
  const settingsVals = deps.loadYaml(settingsFile) as Record<string, any>
  const provider: string | undefined = settingsVals?.kms?.sops?.provider
  if (!provider) {
    d.warn('No sops information given. Assuming no sops enc/decryption needed. Be careful!')
    return
  }

  const templatePath = `${rootDir}/tpl/.sops.yaml.gotmpl`
  const kmsProvider = kmsMap[provider] as string
  const kmsKeys = settingsVals.kms.sops[provider].keys as string

  const obj = {
    provider: kmsProvider,
    keys: kmsKeys,
  }

  const exists = deps.existsSync(targetPath)
  // we can just get the values the first time because those are unencrypted
  const values = exists ? {} : ((await deps.hfValues()) as Record<string, any>)

  d.log(`Creating sops file for provider ${provider}`)
  const output = (await deps.gucci(templatePath, obj, true)) as string
  deps.writeFileSync(targetPath, output)
  d.log(`Ready generating sops files. The configuration is written to: ${targetPath}`)

  d.info('Copying sops related files')
  // add sops related files
  const file = '.gitattributes'
  await deps.copyFile(`${rootDir}/.values/${file}`, `${env.ENV_DIR}/${file}`)

  // prepare some credential files the first time and crypt some
  if (!exists) {
    if (isCli || env.OTOMI_DEV) {
      // first time so we know we have values
      const secretsFile = `${env.ENV_DIR}/.secrets`
      if (provider === 'google') {
        // and we also assume the correct values are given by using '!' (we want to err when not set)
        const serviceKeyJson = JSON.parse(values.kms!.sops!.google!.accountJson)
        // and set it in env for later decryption
        process.env.GCLOUD_SERVICE_KEY = values.kms!.sops!.google!.accountJson
        d.log('Creating gcp-key.json for vscode.')
        deps.writeFileSync(`${env.ENV_DIR}/gcp-key.json`, JSON.stringify(serviceKeyJson))
        d.log(`Creating credentials file: ${secretsFile}`)
        deps.writeFileSync(secretsFile, `GCLOUD_SERVICE_KEY='${JSON.stringify(serviceKeyJson)}'`)
      } else if (provider === 'aws') {
        const v = values.kms!.sops!.aws!
        deps.writeFileSync(secretsFile, `AWS_ACCESS_KEY_ID='${v.accessKey}'\nAWS_ACCESS_KEY_SECRET=${v.secretKey}`)
      } else if (provider === 'azure') {
        const v = values.kms!.sops!.azure!
        deps.writeFileSync(secretsFile, `AZURE_CLIENT_ID='${v.clientId}'\nAZURE_CLIENT_SECRET=${v.clientSecret}`)
      } else if (provider === 'vault') {
        const v = values.kms!.sops!.vault!
        deps.writeFileSync(secretsFile, `VAULT_TOKEN='${v.token}'`)
      }
    }
    // now do a round of encryption and decryption to make sure we have all the files in place for later
    await deps.encrypt()
    await deps.decrypt()
  }
}

export const copySchema = (deps = { terminal, rootDir, env, isCore, loadYaml, copyFileSync }): void => {
  const d = deps.terminal(`cmd:${cmdName}:copySchema`)
  const { ENV_DIR } = env
  const devOnlyPath = `${deps.rootDir}/.vscode/values-schema.yaml`
  const targetPath = `${ENV_DIR}/.vscode/values-schema.yaml`
  const sourcePath = `${deps.rootDir}/values-schema.yaml`

  // const valuesSchema = deps.loadYaml(sourcePath)
  // const trimmedVS = dump(
  //   removeBlankAttributes(JSON.parse(JSON.stringify(valuesSchema, (k, v) => (k === 'required' ? undefined : v), 2))),
  // )
  // d.debug('generated values-schema.yaml: ', trimmedVS)
  // deps.outputFileSync(targetPath, trimmedVS)
  deps.copyFileSync(sourcePath, targetPath)
  d.info(`Stored loose YAML schema at: ${targetPath}`)
  if (deps.isCore) {
    // for validation of .values/env/* files we also generate a schema here:
    // deps.outputFileSync(devOnlyPath, trimmedVS)
    deps.copyFileSync(sourcePath, devOnlyPath)
    d.debug(`Stored loose YAML schema for otomi-core devs at: ${devOnlyPath}`)
  }
}

export const getStoredClusterSecrets = async (
  deps = { terminal, getK8sSecret },
): Promise<Record<string, any> | undefined> => {
  const d = deps.terminal(`cmd:${cmdName}:getStoredClusterSecrets`)
  d.info(`Checking if ${secretId} already exists`)
  if (env.DISABLE_SYNC) return undefined
  // we might need to create the 'otomi' namespace if we are in CLI mode
  if (isCli) await nothrow($`kubectl create ns otomi &> /dev/null`)
  const kubeSecretObject = await deps.getK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, 'otomi')
  if (kubeSecretObject) {
    d.info(`Found ${secretId} secrets on cluster, recovering`)
    return kubeSecretObject
  }
  return undefined
}

export const copyBasicFiles = async (
  deps = { terminal, env, mkdirSync, copyFile, copy, copySchema, existsSync },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:copyBasicFiles`)
  const { ENV_DIR } = deps.env
  const binPath = `${ENV_DIR}/bin`
  deps.mkdirSync(binPath, { recursive: true })
  await Promise.allSettled([
    deps.copyFile(`${rootDir}/bin/aliases`, `${binPath}/aliases`),
    deps.copyFile(`${rootDir}/binzx/otomi`, `${binPath}/otomi`),
  ])
  d.info('Copied bin files')
  deps.mkdirSync(`${ENV_DIR}/.vscode`, { recursive: true })
  await deps.copy(`${rootDir}/.values/.vscode`, `${ENV_DIR}/.vscode`, { recursive: true })
  d.info('Copied vscode folder')

  deps.copySchema()

  // only copy sample files if a real one is not found
  await Promise.allSettled(
    ['.secrets.sample']
      .filter((val) => !deps.existsSync(`${ENV_DIR}/${val.replace(/\.sample$/g, '')}`))
      .map(async (val) => deps.copyFile(`${rootDir}/.values/${val}`, `${ENV_DIR}/${val}`)),
  )

  // force copy all these
  await Promise.allSettled(
    ['.gitignore', '.prettierrc.yml', 'README.md'].map(async (val) =>
      deps.copyFile(`${rootDir}/.values/${val}`, `${ENV_DIR}/${val}`),
    ),
  )
  // recursively copy the skeleton files to env if that folder doesn't yet exist
  if (!existsSync(`${ENV_DIR}/env`)) {
    d.log(`Copying skeleton files`)
    await deps.copy(`${rootDir}/.values/env`, `${ENV_DIR}/env`, { overwrite: false, recursive: true })
  }

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
    writeValues,
    env,
    existsSync,
    hfValues,
    validateValues,
    generateSecrets,
    createK8sSecret,
    createCustomCA,
  },
): Promise<Record<string, any> | undefined> => {
  const d = deps.terminal(`cmd:${cmdName}:processValues`)
  const { ENV_DIR, VALUES_INPUT } = deps.env
  let originalInput: Record<string, any> | undefined
  let originalValues: Record<string, any> | undefined
  let storedSecrets: Record<string, any> | undefined
  if (deps.isChart) {
    d.log(`Loading app values from ${VALUES_INPUT}`)
    originalValues = deps.loadYaml(VALUES_INPUT) as Record<string, any>
    storedSecrets = await deps.getStoredClusterSecrets()
    if (storedSecrets) originalInput = merge(cloneDeep(storedSecrets), cloneDeep(originalValues))
    else originalInput = cloneDeep(originalValues)
    await deps.writeValues(originalInput)
  } else {
    d.log(`Loading repo values from ${ENV_DIR}`)
    // we can only read values from ENV_DIR if we can determine cluster.providers
    storedSecrets = {}
    if (deps.loadYaml(`${ENV_DIR}/env/cluster.yaml`, { noError: true })?.cluster?.provider) {
      await deps.decrypt()
      originalInput = (await deps.hfValues({ filesOnly: true })) as Record<string, any>
    }
    if (originalInput) storedSecrets = originalValues
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
  // merge existing secrets over newly generated ones to keep them
  const allSecrets = merge(cloneDeep(caSecrets), cloneDeep(storedSecrets), cloneDeep(generatedSecrets))
  // we have generated all we need, now store everything by merging the original values over all the secrets
  await deps.writeValues(merge(cloneDeep(allSecrets), cloneDeep(originalValues)))
  // and do some context dependent post processing:
  if (deps.isChart) {
    // to support potential failing chart install we store secrets on cluster
    if (!env.DISABLE_SYNC) await deps.createK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, 'otomi', allSecrets)
  } else if (originalInput)
    // cli: when we are bootstrapping from a non empty values repo, validate the input
    await deps.validateValues()
  return originalInput
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
    existsSync,
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
  const hasOtomi = deps.existsSync(`${ENV_DIR}/bin/otomi`)

  const otomiImage = `otomi/core:${tag}`
  d.log(`Installing artifacts from ${otomiImage}`)
  await deps.copyBasicFiles()
  await deps.migrate()
  const originalValues = await deps.processValues()
  // exit early if `isCli` and `ENV_DIR` were empty, and let the user provide valid values first:
  if (!originalValues) {
    d.log('A new values repo has been created. For next steps follow documentation at https://otomi.io')
    return
  }
  const finalValues = (await deps.hfValues()) as Record<string, any>
  const {
    cluster: { apiName, k8sContext, name, owner, provider },
  } = finalValues
  // we can derive defaults for the following values
  // that we want to end up in the files, so the api can access them
  if (!k8sContext || !apiName || !owner) {
    const add: Record<string, any> = { cluster: {} }
    const engine = providerMap(provider)
    const defaultOwner = 'otomi'
    const defaultName = `${owner || defaultOwner}-${engine}-${name}`
    if (!apiName) {
      d.info(`No value for cluster.apiName found, providing default one: ${defaultName}`)
      add.cluster.apiName = defaultName
    }
    if (!k8sContext) {
      d.info(`No value for cluster.k8sContext found, providing default one: ${defaultName}`)
      add.cluster.k8sContext = defaultName
    }
    if (!owner) {
      d.info(`No value for cluster.owner found, providing default one: ${defaultOwner}`)
      add.cluster.owner = defaultOwner
    }
    await deps.writeValues(add)
  }
  await deps.bootstrapSops()
  // if we did not have the admin password before we know we have generated it for the first time
  // so tell the user about it
  if (!originalValues?.otomi?.adminPassword) {
    d.log(
      '`otomi.adminPassword` has been generated and is stored in the values repository in `env/secrets.settings.yaml`',
    )
  }

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
