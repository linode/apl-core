import { existsSync, mkdirSync } from 'fs'
import { copy, outputFileSync } from 'fs-extra'
import { copyFile } from 'fs/promises'
import { dump } from 'js-yaml'
import { get, merge } from 'lodash'
import { pki } from 'node-forge'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { DEPLOYMENT_PASSWORDS_SECRET } from '../common/constants'
import { decrypt, encrypt } from '../common/crypt'
import { OtomiDebugger, terminal } from '../common/debug'
import { env, isChart, isCli } from '../common/envalid'
import { hfValues } from '../common/hf'
import { createK8sSecret, getK8sSecret, secretId } from '../common/k8s'
import { getFilename, isCore, loadYaml, providerMap, removeBlankAttributes, rootDir } from '../common/utils'
import { generateSecrets, getImageTag, writeValues } from '../common/values'
import { BasicArguments, setParsedArgs } from '../common/yargs'
import { genSops } from './gen-sops'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const generateLooseSchema = (deps = { debug, rootDir, env, isCore, loadYaml, outputFileSync }): void => {
  const { ENV_DIR } = env()
  const devOnlyPath = `${deps.rootDir}/.vscode/values-schema.yaml`
  const targetPath = `${ENV_DIR}/.vscode/values-schema.yaml`
  const sourcePath = `${deps.rootDir}/values-schema.yaml`

  const valuesSchema = deps.loadYaml(sourcePath)
  const trimmedVS = dump(
    removeBlankAttributes(JSON.parse(JSON.stringify(valuesSchema, (k, v) => (k === 'required' ? undefined : v), 2))),
  )
  deps.debug.debug('generated values-schema.yaml: ', trimmedVS)
  deps.outputFileSync(targetPath, trimmedVS)
  deps.debug.info(`Stored loose YAML schema at: ${targetPath}`)
  if (deps.isCore) {
    // for validation of .values/env/* files we also generate a loose schema here:
    deps.outputFileSync(devOnlyPath, trimmedVS)
    deps.debug.debug(`Stored loose YAML schema for otomi-core devs at: ${devOnlyPath}`)
  }
}

export const getStoredClusterSecrets = async (
  deps = { debug, getK8sSecret },
): Promise<Record<string, any> | undefined> => {
  deps.debug.info(`Checking if ${secretId} already exists`)
  const kubeSecretObject = await deps.getK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, env().DEPLOYMENT_NAMESPACE)
  if (kubeSecretObject) {
    deps.debug.info(`Found ${secretId} secrets on cluster, recovering`)
    return kubeSecretObject
  }
  return undefined
}

export const copyBasicFiles = async (
  deps = { debug, env, mkdirSync, copyFile, copy, generateLooseSchema, existsSync },
): Promise<void> => {
  const { ENV_DIR } = deps.env()
  const binPath = `${ENV_DIR}/bin`
  deps.mkdirSync(binPath, { recursive: true })
  await Promise.allSettled([
    deps.copyFile(`${rootDir}/bin/aliases`, `${binPath}/aliases`),
    deps.copyFile(`${rootDir}/binzx/otomi`, `${binPath}/otomi`),
  ])
  deps.debug.info('Copied bin files')
  deps.mkdirSync(`${ENV_DIR}/.vscode`, { recursive: true })
  await deps.copy(`${rootDir}/.values/.vscode`, `${ENV_DIR}/.vscode`, { recursive: true })
  deps.debug.info('Copied vscode folder')

  deps.generateLooseSchema()

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
    deps.debug.log(`Copying skeleton files`)
    await deps.copy(`${rootDir}/.values/env`, `${ENV_DIR}/env`, { overwrite: false, recursive: true })
  }

  // copy these files from core
  await Promise.allSettled(['core.yaml'].map((val) => deps.copyFile(`${rootDir}/${val}`, `${ENV_DIR}/${val}`)))
}

// retrieves input values from either VALUES_INPUT or ENV_DIR
// and creates missing secrets as well (and stores them in a secret in chart mode)
export const processValues = async (
  deps = {
    debug,
    isChart,
    loadYaml,
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
  const { ENV_DIR, VALUES_INPUT } = deps.env()
  let originalValues: Record<string, any> | undefined
  let storedSecrets: Record<string, any> | undefined
  if (deps.isChart) {
    deps.debug.log(`Loading chart values from ${VALUES_INPUT}`)
    originalValues = deps.loadYaml(VALUES_INPUT) as Record<string, any>
    storedSecrets = await deps.getStoredClusterSecrets()
    if (storedSecrets) originalValues = merge(originalValues, storedSecrets)
    await deps.writeValues(originalValues, true)
  } else {
    deps.debug.log(`Loading repo values from ${ENV_DIR}`)
    // we can only read values from ENV_DIR if we can determine cluster.providers
    storedSecrets = {}
    if (deps.loadYaml(`${ENV_DIR}/env/cluster.yaml`, { noError: true })?.cluster?.provider) {
      originalValues = (await deps.hfValues()) as Record<string, any>
    }
    if (originalValues) storedSecrets = originalValues
  }
  // generate secrets that don't exist yet
  const generatedSecrets = await deps.generateSecrets(storedSecrets)
  // do we need to create a custom CA? if so add it to the secrets
  const cm = get(originalValues, 'charts.cert-manager', {})
  let caSecrets = {}
  if (cm.issuer === 'custom-ca' || cm.issuer === undefined) {
    if (cm.customRootCA && cm.customRootCAKey) {
      deps.debug.info('Skipping custom RootCA generation')
    } else {
      caSecrets = deps.createCustomCA(originalValues as Record<string, any>)
    }
  }
  // we have generated all we need, now store the values and merge in the secrets
  await deps.writeValues(merge(originalValues, generatedSecrets, caSecrets), true)
  // and do some context dependent post processing:
  if (deps.isChart) {
    // to support potential failing chart install we store secrets on cluster
    await deps.createK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, env().DEPLOYMENT_NAMESPACE, generatedSecrets)
  } else if (originalValues)
    // cli: when we are bootstrapping from a non empty values repo, validate the input
    await deps.validateValues()
  return originalValues
}

/**
 * Creates a custom CA cert and key pair in the location as defined in the schema. i.e.:
 *
 * charts:
 *   cert-manager:
 *     customRootCA: rootCrt,
 *     customRootCAKey: rootKey
 */
export const createCustomCA = (
  originalValues: Record<string, any>,
  deps = { terminal, pki, writeValues },
): Record<string, any> => {
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

  return merge(originalValues, {
    charts: {
      'cert-manager': {
        customRootCA: rootCrt,
        customRootCAKey: rootKey,
      },
    },
  })
}

export const bootstrapValues = async (
  deps = {
    existsSync,
    getImageTag,
    debug,
    copyBasicFiles,
    processValues,
    hfValues,
    isCli,
    writeValues,
    genSops,
    copyFile,
    encrypt,
    decrypt,
  },
): Promise<void> => {
  const { ENV_DIR } = env()
  const hasOtomi = deps.existsSync(`${ENV_DIR}/bin/otomi`)

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
  const finalValues = (await deps.hfValues()) as Record<string, any>
  if (deps.isCli && !finalValues.cluster.k8sContext) {
    const k8sContext = `otomi-${providerMap(finalValues.cluster.provider)}-${finalValues.cluster.name}`
    deps.debug.info(`No value for cluster.k8sContext found, providing default one: ${k8sContext}`)
    await deps.writeValues({ cluster: { k8sContext } }, true)
  }
  await deps.genSops()
  if (deps.existsSync(`${ENV_DIR}/.sops.yaml`)) {
    deps.debug.info('Copying sops related files')
    // add sops related files
    const file = '.gitattributes'
    await deps.copyFile(`${rootDir}/.values/${file}`, `${ENV_DIR}/${file}`)
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
  handler: async (argv: BasicArguments): Promise<void> => {
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
