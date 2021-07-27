import cliSelect from 'cli-select'
import { existsSync, readdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { $, chalk, nothrow } from 'zx'
import { decrypt } from './crypt'
import { terminal } from './debug'
import { env } from './envalid'
import { BasicArguments, loadYaml, parser } from './no-deps'
import { evaluateSecrets } from './secrets'
import { ask, askYesNo, source } from './zx-enhance'

chalk.level = 2
const dirname = fileURLToPath(import.meta.url)

let otomiImageTag: string
let otomiCustomerName: string
let otomiK8sVersion: string
const debug = {
  prepEnv: terminal('prepare environment'),
  kubeContext: terminal('Check Kube Context'),
  checkEnvDir: terminal('Check ENV Dir'),
  closeInCore: terminal('Close in otomi-core'),
}
/**
 * Check whether the environment matches the configuration for the Kubernetes Context
 * @returns
 */
const checkKubeContext = async (): Promise<void> => {
  if (env.CI) return
  debug.kubeContext.info('Validating kube context')

  const envPath = `${env.ENV_DIR}/env/.env`
  if (!existsSync(envPath)) {
    const currentContext = (await $`kubectl config current-context`).stdout.trim()
    const output = await $`kubectl config get-contexts -o=name`
    const other = 'Other'
    const out = output.stdout
      .split('\n')
      .map((val) => val.trim())
      .filter(Boolean)
    debug.kubeContext.log('No k8s context was defined in your values, please select one.')
    const res = await cliSelect({
      values: [...out, other],
      defaultValue: out.indexOf(currentContext),
      valueRenderer: (value, selected) => (selected ? chalk.underline(value) : value),
    })
    let val = res.value
    if (val === other) {
      debug.kubeContext.log(
        chalk.hex('#FFA500')(
          'You are going to input a context that is not yet defined, not all commands might work as expected',
        ),
      )
      val = await ask('What context should be selected?', { defaultAnswer: currentContext })
    }
    writeFileSync(envPath, `export K8S_CONTEXT="${val}"\n`)
    process.env.K8S_CONTEXT = val
  } else {
    try {
      await source(envPath)
    } catch (error) {
      debug.kubeContext.exit(1, error)
    }
  }

  if (!('K8S_CONTEXT' in process.env)) debug.kubeContext.exit(1, `K8S_CONTEXT is not defined in '${envPath}'`)
  debug.kubeContext.info(`Using kube context: ${process.env.K8S_CONTEXT}`)

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
  if (dirname.includes('otomi-core') && !env.ENV_DIR) {
    debug.checkEnvDir.exit(1, 'The ENV_DIR environment variable is not set')
  }
  debug.checkEnvDir.debug(env.ENV_DIR)
  return readdirSync(env.ENV_DIR).length > 0
}

export type PrepareEnvironmentOptions = {
  skipEnvDirCheck?: boolean
  skipEvaluateSecrets?: boolean
  skipKubeContextCheck?: boolean
  skipDecrypt?: boolean
  skipAll?: boolean
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
  customerName: (): string => {
    if (otomiCustomerName) return otomiCustomerName
    if (!clusterFile) {
      clusterFile = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)
    }
    otomiCustomerName = clusterFile.cluster?.owner
    return otomiCustomerName
  },
  /**
   * Prepare environment when running an otomi command
   */
  prepareEnvironment: async (options?: PrepareEnvironmentOptions): Promise<void> => {
    if (options && options.skipAll) return
    debug.prepEnv.info('Checking environment')
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
  closeIfInCore: (command: string): void => {
    if (dirname.includes('otomi-core') || env.ENV_DIR.includes('otomi-core'))
      debug.closeInCore.exit(1, `'otomi ${command}' should not be ran from otomi-core`)
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
