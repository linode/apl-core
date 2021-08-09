import cliSelect from 'cli-select'
import { existsSync, readdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { $, chalk, nothrow } from 'zx'
import { decrypt } from './crypt'
import { terminal } from './debug'
import { env } from './envalid'
import { evaluateSecrets } from './secrets'
import { BasicArguments, loadYaml, parser } from './utils'
import { askYesNo, source } from './zx-enhance'

chalk.level = 2
const dirname = fileURLToPath(import.meta.url)

let otomiImageTag: string
let otomiClusterOwner: string
let otomiK8sVersion: string

/**
 * Check whether the environment matches the configuration for the Kubernetes Context
 * @returns
 */
const checkKubeContext = async (): Promise<void> => {
  if (env.CI) return
  const debug = terminal('checkKubeContext')

  if (existsSync('/var/run/secrets/kubernetes.io/serviceaccount/token')) {
    // Command is performed in Pod with service account token mounted as a file
    // Read more: https://kubernetes.io/docs/tasks/run-application/access-api-from-pod/#directly-accessing-the-rest-api
    debug.info('Discovered service account token')
    return
  }

  debug.info('Validating kube context')

  const envPath = `${env.ENV_DIR}/env/.env`
  if (!existsSync(envPath)) {
    const currentContext = (await $`kubectl config current-context`).stdout.trim()
    const output = await $`kubectl config get-contexts -o=name`
    const cancel = 'Cancel'
    const out = output.stdout
      .split('\n')
      .map((val) => val.trim())
      .filter(Boolean)
    debug.log(`No k8s context was defined in ${envPath} file , please select one.`)
    const res = await cliSelect({
      values: [...out, cancel],
      defaultValue: out.indexOf(currentContext),
      valueRenderer: (value, selected) => (selected ? chalk.underline(value) : value),
    })
    const val = res.value
    if (val === cancel) {
      debug.error('Please set an appropriate K8S context')
      process.exit(0)
    }
    writeFileSync(envPath, `export K8S_CONTEXT="${val}"\n`)
    process.env.K8S_CONTEXT = val
  } else {
    try {
      await source(envPath)
    } catch (error) {
      debug.error(error)
      process.exit(1)
    }
  }

  if (!('K8S_CONTEXT' in process.env)) {
    debug.error(`K8S_CONTEXT is not defined in '${envPath}'`)
    process.exit(1)
  }
  debug.info(`Using kube context: ${process.env.K8S_CONTEXT}`)

  // TODO: Consider using the kubernetes-client: https://github.com/kubernetes-client/javascript
  const runningContext = (await nothrow($`kubectl config current-context`)).stdout.trim()
  if (process.env.K8S_CONTEXT !== runningContext) {
    let fixContext = false
    if (!(parser.argv as BasicArguments).setContext) {
      fixContext = await askYesNo(
        `Warning: Your current kubernetes context (${runningContext}) does not match cluster context: ${process.env.K8S_CONTEXT}. Would you like to switch kube context to cluster first?`,
        { defaultYes: true },
      )
    }
    if (fixContext || (parser.argv as BasicArguments).setContext) {
      await $`kubectl config use ${process.env.K8S_CONTEXT}`
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
  skipEvaluateSecrets?: boolean
  skipKubeContextCheck?: boolean
  skipDecrypt?: boolean
  skipAllPreChecks?: boolean
}

let clusterFile: any
export const otomi = {
  scriptName: process.env.OTOMI_CALLER_COMMAND ?? 'otomi',
  /**
   * Find the cluster kubernetes version in the values
   * @returns String of the kubernetes version on the cluster
   */
  getK8sVersion: (): string => {
    if (otomiK8sVersion) return otomiK8sVersion
    if (!clusterFile) {
      clusterFile = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)
    }
    otomiK8sVersion = clusterFile.cluster?.k8sVersion
    return otomiK8sVersion
  },
  /**
   * Find what image tag is defined in configuration for otomi
   * @returns string
   */
  imageTag: (): string => {
    if (otomiImageTag) return otomiImageTag
    const file = `${env.ENV_DIR}/env/settings.yaml`
    if (!existsSync(file)) return process.env.OTOMI_TAG ?? 'master'
    const settingsFile = loadYaml(file)
    otomiImageTag = settingsFile.otomi?.version ?? 'master'
    return otomiImageTag
  },
  /**
   * Find the customer name that is defined in configuration for otomi
   * @returns string
   */
  clusterOwner: (): string => {
    if (otomiClusterOwner) return otomiClusterOwner
    if (!clusterFile) {
      clusterFile = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)
    }
    otomiClusterOwner = clusterFile.cluster?.owner
    return otomiClusterOwner
  },
  /**
   * Prepare environment when running an otomi command
   */
  prepareEnvironment: async (options?: PrepareEnvironmentOptions): Promise<void> => {
    if (options?.skipAllPreChecks) return
    const debug = terminal('prepareEnvironment')
    debug.info('Checking environment')
    if (!options?.skipEnvDirCheck && checkEnvDir()) {
      if (!env.CI && !options?.skipEvaluateSecrets) await evaluateSecrets()
      if (!env.CI && !options?.skipKubeContextCheck) await checkKubeContext()
      if (!env.CI && !options?.skipDecrypt) await decrypt()
    }
  },
  /**
   * If ran within otomi-core, stop execution as it should not be ran within that folder.
   * @param command that is executed
   */
  exitIfInCore: (command: string): void => {
    if (dirname.includes('otomi-core') || env.ENV_DIR.includes('otomi-core')) {
      const debug = terminal('exitIfInCore')
      debug.error(`'otomi ${command}' should not be ran from otomi-core`)
      process.exit(1)
    }
  },
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
