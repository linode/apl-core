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
let otomiK8sVersion: string

/**
 * Check whether the environment matches the configuration for the kubernetes context
 * @returns
 */
const checkKubeContext = async (): Promise<void> => {
  if (env.CI) return
  const d = terminal('checkKubeContext')
  d.info('Validating kube context')

  const values = await hfValues()
  const currentContext = (await $`kubectl config current-context`).stdout.trim()
  const k8sContext = values?.cluster?.k8sContext
  d.debug('currentContext: ', currentContext)
  d.debug('k8sContext: ', k8sContext)

  d.info(`Using kube context: ${currentContext}`)

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
  const d = terminal('checkEnvDir')
  if (dirname.includes('otomi-core') && !env.ENV_DIR) {
    throw new Error('The ENV_DIR environment variable is not set')
  }
  d.debug(`ENV_DIR: ${env.ENV_DIR}`)
  return readdirSync(env.ENV_DIR).length > 0
}

type PrepareEnvironmentOptions = {
  skipEnvDirCheck?: boolean
  skipKubeContextCheck?: boolean
  skipDecrypt?: boolean
  skipAllPreChecks?: boolean
}

export const scriptName = process.env.OTOMI_CALLER_COMMAND ?? 'otomi'
/**
 * Find the cluster kubernetes version in the values
 * @returns String of the kubernetes version on the cluster
 */
export const getK8sVersion = (): string => {
  if (otomiK8sVersion) return otomiK8sVersion
  const clusterFile: any = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)
  otomiK8sVersion = clusterFile.cluster!.k8sVersion!
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
// /**
//  * Find the customer name that is defined in configuration for otomi
//  * @returns string
//  */
// export const getClusterOwner = (): string => {
//   if (otomiClusterOwner) return otomiClusterOwner
//   const clusterFile: any = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)
//   otomiClusterOwner = clusterFile.cluster?.owner
//   return otomiClusterOwner
// }
/**
 * Prepare environment when running an otomi command
 */
export const prepareEnvironment = async (options?: PrepareEnvironmentOptions): Promise<void> => {
  if (options?.skipAllPreChecks) return
  const d = terminal('prepareEnvironment')
  d.info('Checking environment')
  if (!options?.skipEnvDirCheck && checkEnvDir()) {
    if (!env.CI && !options?.skipKubeContextCheck) await checkKubeContext()
    if (!options?.skipDecrypt) await decrypt()
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
