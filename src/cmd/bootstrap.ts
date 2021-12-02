import { existsSync, mkdirSync } from 'fs'
import { copy, outputFileSync } from 'fs-extra'
import { copyFile } from 'fs/promises'
import { dump } from 'js-yaml'
import { get } from 'lodash'
import { pki } from 'node-forge'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { DEPLOYMENT_PASSWORDS_SECRET } from '../common/constants'
import { decrypt, encrypt } from '../common/crypt'
import { OtomiDebugger, terminal } from '../common/debug'
import { env, isChart, isCli } from '../common/envalid'
import { hfValues } from '../common/hf'
import { createK8sSecret, getK8sSecret, secretId } from '../common/k8s'
import { getFilename, isCore, loadYaml, providerMap, rootDir } from '../common/utils'
import { generateSecrets, getImageTag, writeValues } from '../common/values'
import { BasicArguments, setParsedArgs } from '../common/yargs'
import { genSops } from './gen-sops'
import { validateValues } from './validate-values'

type Arguments = BasicArguments

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const generateLooseSchema = (deps = { debug, rootDir, env, isCore, loadYaml, outputFileSync }): void => {
  const devOnlyPath = `${deps.rootDir}/.vscode/values-schema.yaml`
  const targetPath = `${deps.env().ENV_DIR}/.vscode/values-schema.yaml`
  const sourcePath = `${deps.rootDir}/values-schema.yaml`

  const valuesSchema = deps.loadYaml(sourcePath)
  const trimmedVS = dump(JSON.parse(JSON.stringify(valuesSchema, (k, v) => (k === 'required' ? undefined : v), 2)))
  deps.debug.debug('generated values-schema.yaml: ', trimmedVS)
  deps.outputFileSync(targetPath, trimmedVS)
  deps.debug.info(`Stored loose YAML schema at: ${targetPath}`)
  if (deps.isCore) {
    // for validation of .values/env/* files we also generate a loose schema here:
    deps.outputFileSync(devOnlyPath, trimmedVS)
    deps.debug.debug(`Stored loose YAML schema for otomi-core devs at: ${devOnlyPath}`)
  }
}

const getEnvDirValues = async (): Promise<Record<string, any> | undefined> => {
  if (
    existsSync(`${env().ENV_DIR}/env/cluster.yaml`) &&
    loadYaml(`${env().ENV_DIR}/env/cluster.yaml`)?.cluster?.provider
  ) {
    return hfValues()
  }
  return undefined
}

const getStoredClusterSecrets = async (): Promise<Record<string, any> | undefined> => {
  debug.info(`Checking if ${secretId} already exists`)
  const kubeSecretObject = await getK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, env().DEPLOYMENT_NAMESPACE)
  if (kubeSecretObject) {
    debug.info(`Found ${secretId} secrets on cluster, recovering`)
    return kubeSecretObject
  }
  return undefined
}

const storeClusterSecrets = (data: Record<string, any>): Promise<void> => {
  return createK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, env().DEPLOYMENT_NAMESPACE, data)
}

const copyBasicFiles = async (): Promise<void> => {
  const binPath = `${env().ENV_DIR}/bin`
  mkdirSync(binPath, { recursive: true })
  await Promise.allSettled([
    copyFile(`${rootDir}/bin/aliases`, `${binPath}/aliases`),
    copyFile(`${rootDir}/binzx/otomi`, `${binPath}/otomi`),
  ])
  debug.info('Copied bin files')
  mkdirSync(`${env().ENV_DIR}/.vscode`, { recursive: true })
  await copy(`${rootDir}/.values/.vscode`, `${env().ENV_DIR}/.vscode`, { recursive: true })
  debug.info('Copied vscode folder')

  generateLooseSchema()

  // only copy sample files if a real one is not found
  await Promise.allSettled(
    ['.secrets.sample']
      .filter((val) => !existsSync(`${env().ENV_DIR}/${val.replace(/\.sample$/g, '')}`))
      .map(async (val) => copyFile(`${rootDir}/.values/${val}`, `${env().ENV_DIR}/${val}`)),
  )

  // force copy all these
  await Promise.allSettled(
    ['.gitignore', '.prettierrc.yml', 'README.md'].map(async (val) =>
      copyFile(`${rootDir}/.values/${val}`, `${env().ENV_DIR}/${val}`),
    ),
  )
  // recursively copy the skeleton files to env if that folder doesn't yet exist
  if (!existsSync(`${env().ENV_DIR}/env`)) {
    debug.log(`Copying skeleton files`)
    await copy(`${rootDir}/.values/env`, `${env().ENV_DIR}/env`, { overwrite: false, recursive: true })
  }

  // copy these files from core
  await Promise.allSettled(['core.yaml'].map((val) => copyFile(`${rootDir}/${val}`, `${env().ENV_DIR}/${val}`)))
}

// retrieves input values from either VALUES_INPUT or ENV_DIR
// and creates missing secrets as well (and stores them in a secret in chart mode)
export const processValues = async (
  deps = {
    isChart,
    loadYaml,
    getStoredClusterSecrets,
    writeValues,
    env,
    getEnvDirValues,
    validateValues,
    generateSecrets,
    storeClusterSecrets,
  },
): Promise<Record<string, any>> => {
  let originalValues: Record<string, any>
  if (deps.isChart) {
    console.debug(`Loading chart values from ${deps.env().VALUES_INPUT}`)
    originalValues = deps.loadYaml(deps.env().VALUES_INPUT) as Record<string, any>
    const storedSecrets = await deps.getStoredClusterSecrets()
    if (storedSecrets) originalValues = { ...originalValues, ...storedSecrets }
    await deps.writeValues(originalValues, true)
  } else {
    console.debug(`Loading repo values from ${deps.env().ENV_DIR}`)
    originalValues = (await deps.getEnvDirValues()) as Record<string, any>
    // when we are bootstrapping from a non empty values repo, validate the input
    if (originalValues) await deps.validateValues()
  }
  // generate secrets that don't exist yet
  const generatedSecrets = await deps.generateSecrets(originalValues)

  await deps.writeValues(generatedSecrets, false)
  if (deps.isChart) {
    // and store secrets on cluster in case of failure
    await deps.storeClusterSecrets(generatedSecrets)
  }
  return originalValues
}

export const createCustomCA = async (
  originalValues: Record<string, any>,
  deps = { pki, writeValues, terminal },
): Promise<void> => {
  const d = deps.terminal('createCustomCA')
  const cm = get(originalValues, 'charts.cert-manager', {})

  if (cm.customRootCA && cm.customRootCAKey) {
    d.info('Skipping custom RootCA generation')
    return
  }
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

  const value = {
    charts: {
      'cert-manager': {
        customRootCA: rootCrt,
        customRootCAKey: rootKey,
      },
    },
  }
  await deps.writeValues(value, true)
  d.info('Generated root CA and key are stored in charts.cert-manager values')
}

export const bootstrapValues = async (
  deps = {
    existsSync,
    getImageTag,
    debug,
    copyBasicFiles,
    processValues,
    getEnvDirValues,
    createCustomCA,
    isCli,
    writeValues,
    genSops,
    copyFile,
    encrypt,
    decrypt,
  },
): Promise<void> => {
  const hasOtomi = deps.existsSync(`${env().ENV_DIR}/bin/otomi`)

  const imageTag = await deps.getImageTag()
  const otomiImage = `otomi/core:${imageTag}`
  deps.debug.info(`Intalling artifacts from ${otomiImage}`)
  await deps.copyBasicFiles()

  const originalValues = await deps.processValues()
  // exit early if `isCli` and `ENV_DIR` were empty, and let the user provide valid values first:
  if (!originalValues) {
    deps.debug.log('A new values repo has been created. For next steps follow otomi.io/docs.')
    return
  }
  const finalValues = (await deps.getEnvDirValues()) as Record<string, any>
  if (finalValues.charts['cert-manager'].issuer === 'custom-ca') await deps.createCustomCA(originalValues)
  if (deps.isCli && !finalValues.cluster.k8sContext) {
    const k8sContext = `otomi-${providerMap(finalValues.cluster.provider)}-${finalValues.cluster.name}`
    deps.debug.info(`No value for cluster.k8sContext found, providing default one: ${k8sContext}`)
    await deps.writeValues({ cluster: { k8sContext } }, true)
  }
  await deps.genSops()
  if (deps.existsSync(`${env().ENV_DIR}/.sops.yaml`)) {
    deps.debug.info('Copying sops related files')
    // add sops related files
    const file = '.gitattributes'
    await deps.copyFile(`${rootDir}/.values/${file}`, `${env().ENV_DIR}/${file}`)
    // now do a round of encryption and decryption to make sure we have all the files in place for validation
    await deps.encrypt()
    await deps.decrypt()
  }
  // if we did not have the admin password before we know we have generated it for the first time
  // so tell the user about it
  if (!originalValues?.otomi?.adminPassword) {
    deps.debug.log(
      '`otomi.adminPassword` has been generated and is stored in the values repository in `env/secrets.settings.yaml`',
    )
  }

  if (!hasOtomi) {
    deps.debug.log('You can now use the otomi CLI')
  }
  deps.debug.log(`Done bootstrapping values`)
}

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
  },
}
