import { existsSync, readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { $, chalk } from 'zx'
import { decrypt } from './crypt'
import { env } from './envalid'
import { hfValues } from './hf'
import { BasicArguments, loadYaml, parser, terminal } from './utils'
import { askYesNo } from './zx-enhance'

chalk.level = 2
const dirname = fileURLToPath(import.meta.url)

let otomiImageTag: string
let otomiClusterOwner: string
let otomiK8sVersion: string
export const rootDir = process.cwd()

/**
 * Check whether the environment matches the configuration for the kubernetes context
 * @returns
 */
const checkKubeContext = async (): Promise<void> => {
  if (env.CI) return
  const debug = terminal('checkKubeContext')
  debug.info('Validating kube context')

  const values: any = await hfValues()
  const currentContext = (await $`kubectl config current-context`).stdout.trim()
  const k8sContext = values?.cluster?.k8sContext
  debug.debug('currentContext: ', currentContext)
  debug.debug('k8sContext: ', k8sContext)

  debug.info(`Using kube context: ${currentContext}`)

  if (k8sContext !== currentContext) {
    let fixContext = false
    if (!(parser.argv as BasicArguments).setContext) {
      fixContext = await askYesNo(
        `Warning: Your current kubernetes context (${currentContext}) does not match cluster context: ${k8sContext}. Would you like to switch kube context to cluster first?`,
        { defaultYes: true },
      )
    }
    if (fixContext || (parser.argv as BasicArguments).setContext) {
      await $`kubectl config use ${k8sContext}`
    }
  }
}
/**
 * Check the ENV_DIR parameter and whether or not the folder is populated
 * @returns
 */
const checkEnvDir = (): boolean => {
  const debug = terminal('checkEnvDir')
  if (dirname.includes('otomi-core') && !env.ENV_DIR) {
    debug.error('The ENV_DIR environment variable is not set')
    process.exit(1)
  }
  debug.debug(`ENV_DIR: ${env.ENV_DIR}`)
  return readdirSync(env.ENV_DIR).length > 0
}

export type PrepareEnvironmentOptions = {
  skipEnvDirCheck?: boolean
  skipKubeContextCheck?: boolean
  skipDecrypt?: boolean
  skipAllPreChecks?: boolean
}

let clusterFile: any
export const scriptName = process.env.OTOMI_CALLER_COMMAND ?? 'otomi'
/**
 * Find the cluster kubernetes version in the values
 * @returns String of the kubernetes version on the cluster
 */
export const getK8sVersion = (): string => {
  if (otomiK8sVersion) return otomiK8sVersion
  if (!clusterFile) {
    clusterFile = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)
  }
  otomiK8sVersion = clusterFile.cluster?.k8sVersion
  return otomiK8sVersion
}
/**
 * Find what image tag is defined in configuration for otomi
 * @returns string
 */
export const getImageTag = (): string => {
  if (otomiImageTag) return otomiImageTag
  const file = `${env.ENV_DIR}/env/settings.yaml`
  if (!existsSync(file)) return process.env.OTOMI_TAG ?? 'master'
  const settingsFile = loadYaml(file)
  otomiImageTag = settingsFile?.otomi?.version ?? 'master'
  return otomiImageTag
}
/**
 * Find the customer name that is defined in configuration for otomi
 * @returns string
 */
export const getClusterOwner = (): string => {
  if (otomiClusterOwner) return otomiClusterOwner
  if (!clusterFile) {
    clusterFile = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)
  }
  otomiClusterOwner = clusterFile.cluster?.owner
  return otomiClusterOwner
}
/**
 * Prepare environment when running an otomi command
 */
export const prepareEnvironment = async (options?: PrepareEnvironmentOptions): Promise<void> => {
  if (options?.skipAllPreChecks) return
  const debug = terminal('prepareEnvironment')
  debug.info('Checking environment')
  if (!options?.skipEnvDirCheck && checkEnvDir()) {
    if (!env.CI && !options?.skipKubeContextCheck) await checkKubeContext()
    if (!options?.skipDecrypt) await decrypt()
  }
}
/**
 * If ran within otomi-core, stop execution as it should not be ran within that folder.
 * @param command that is executed
 */
export const exitIfInCore = (command: string): void => {
  if (dirname.includes('otomi-core') || env.ENV_DIR.includes('otomi-core')) {
    const debug = terminal('exitIfInCore')
    debug.error(`'otomi ${command}' should not be ran from otomi-core`)
    process.exit(1)
  }
}

/**
 * Cleanup trap on exit - any handler function MUST be synchronous
 * @param handler cleanup function set per command
 */
export const cleanupHandler = (handler: () => any): void => {
  process.on('exit', (code) => {
    handler()
    process.exit(code)
  })
}
