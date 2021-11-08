import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { copy } from 'fs-extra'
import { copyFile } from 'fs/promises'
import { dump } from 'js-yaml'
import { get } from 'lodash'
import { pki } from 'node-forge'
import { Argv } from 'yargs'
import { DEPLOYMENT_PASSWORDS_SECRET } from '../common/constants'
import { decrypt, encrypt } from '../common/crypt'
import { env, isChart } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getImageTag, prepareEnvironment } from '../common/setup'
import {
  BasicArguments,
  createK8sSecret,
  generateSecrets,
  getFilename,
  getK8sSecret,
  isCore,
  loadYaml,
  OtomiDebugger,
  rootDir,
  setParsedArgs,
  terminal,
} from '../common/utils'
import { writeValues } from '../common/values'
import { genSops } from './gen-sops'
import { validateValues } from './validate-values'

type Arguments = BasicArguments

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

const generateLooseSchema = () => {
  const devOnlyPath = `${rootDir}/.vscode/values-schema.yaml`
  const targetPath = `${env.ENV_DIR}/.vscode/values-schema.yaml`
  const sourcePath = `${rootDir}/values-schema.yaml`

  const valuesSchema = loadYaml(sourcePath)
  const trimmedVS = dump(JSON.parse(JSON.stringify(valuesSchema, (k, v) => (k === 'required' ? undefined : v), 2)))
  debug.debug('generated values-schema.yaml: ', trimmedVS)
  writeFileSync(targetPath, trimmedVS)
  debug.info(`Stored loose YAML schema at: ${targetPath}`)
  if (isCore) {
    // for validation of .values/env/* files we also generate a loose schema here:
    writeFileSync(devOnlyPath, trimmedVS)
    debug.debug(`Stored loose YAML schema for otomi-core devs at: ${devOnlyPath}`)
  }
}

const getCurrentValues = async (): Promise<Record<string, any> | undefined> => {
  if (existsSync(`${env.ENV_DIR}/env/cluster.yaml`) && loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)?.cluster?.provider) {
    await validateValues()
    return hfValues()
  }
  return undefined
}

const getOtomiSecrets = async (
  // The chart job calls bootstrap only if the otomi-status config map does not exists
  originalValues: Record<string, any>,
): Promise<Record<string, any>> => {
  let generatedSecrets: Record<string, any>
  // The chart job calls bootstrap only if the otomi-status config map does not exists
  const secretId = `secret/${env.DEPLOYMENT_NAMESPACE}/${DEPLOYMENT_PASSWORDS_SECRET}`
  debug.info(`Checking ${secretId} already exist on cluster`)
  const kubeSecretObject = await getK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, env.DEPLOYMENT_NAMESPACE)
  if (!kubeSecretObject) {
    debug.info(`Creating ${secretId}`)
    generatedSecrets = await generateSecrets(originalValues)
    await createK8sSecret(DEPLOYMENT_PASSWORDS_SECRET, env.DEPLOYMENT_NAMESPACE, generatedSecrets)
    debug.info(`Created ${secretId}`)
  } else {
    debug.info(`Found ${secretId} secrets on cluster, recovering`)
    generatedSecrets = kubeSecretObject
  }
  return generatedSecrets
}

const copyBasicFiles = async (): Promise<void> => {
  const binPath = `${env.ENV_DIR}/bin`
  mkdirSync(binPath, { recursive: true })
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
}

const processValues = async (): Promise<Record<string, any>> => {
  let originalValues: Record<string, any>
  if (isChart) {
    console.debug(`Loading chart values from ${env.VALUES_INPUT}`)
    originalValues = loadYaml(env.VALUES_INPUT) as Record<string, any>
    // store chart input values, so they can be merged with gerenerated passwords
    await writeValues(originalValues)
  } else {
    console.debug(`Loading repo values from ${env.ENV_DIR}`)
    originalValues = (await getCurrentValues()) as Record<string, any>
  }
  const generatedSecrets = await getOtomiSecrets(originalValues)
  await writeValues(generatedSecrets, false)
  return originalValues
}

const createCustomCA = async (originalValues: Record<string, any>): Promise<void> => {
  const d = terminal('createCustomCA')
  const cm = get(originalValues, 'charts.cert-manager', {})

  if (cm.customRootCA && cm.customRootCAKey) {
    d.info('Skipping custom RootCA generation')
    return
  }
  d.info('Generating custom root CA')

  // Code example from: https://www.npmjs.com/package/node-forge#x509
  const keys = pki.rsa.generateKeyPair(2048)
  const cert = pki.createCertificate()
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
  const rootCrt = pki.certificateToPem(cert).replaceAll('\r\n', '\n')
  const rootKey = pki.privateKeyToPem(keys.privateKey).replaceAll('\r\n', '\n')

  const value = {
    charts: {
      'cert-manager': {
        customRootCA: rootCrt,
        customRootCAKey: rootKey,
      },
    },
  }
  await writeValues(value, true)
  d.info('Generated root CA and key are stored in charts.cert-manager values')
}

const bootstrapValues = async (): Promise<void> => {
  const hasOtomi = existsSync(`${env.ENV_DIR}/bin/otomi`)

  const imageTag = await getImageTag()
  const otomiImage = `otomi/core:${imageTag}`
  debug.info(`Intalling artifacts from ${otomiImage}`)
  await copyBasicFiles()

  const originalValues = await processValues()
  if (originalValues.charts['cert-manager'].issuer === 'custom-ca') await createCustomCA(originalValues)
  await genSops()
  if (existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    debug.info('Copying sops related files')
    // add sops related files
    const file = '.gitattributes'
    await copyFile(`${rootDir}/.values/${file}`, `${env.ENV_DIR}/${file}`)
    // now do a round of encryption and decryption to make sure we have all the files in place for validation
    await encrypt()
    await decrypt()
  }
  // if we did not have the admin password before we know we have generated it for the first time
  // so tell the user about it
  if (!originalValues?.otomi?.adminPassword) {
    debug.log(
      '`otomi.adminPassword` has been generated and is stored in the values repository in `env/secrets.settings.yaml`',
    )
  }

  if (!hasOtomi) {
    debug.log('You can now use the otomi CLI')
  }
  debug.log(`Done bootstrapping values`)
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
