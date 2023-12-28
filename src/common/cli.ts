import { readdir } from 'fs/promises'
import { chalk } from 'zx'
import { decrypt } from './crypt'
import { terminal } from './debug'
import { env } from './envalid'
import { isCore } from './utils'

chalk.level = 2
/**
 * Check the ENV_DIR parameter and whether or not the folder is populated
 * @returns
 */
const isReadyEnvDir = async (): Promise<boolean> => {
  const { ENV_DIR, isDev } = env
  const d = terminal('common:isReadyEnvDir')
  if (isDev && isCore && !ENV_DIR) {
    throw new Error('The ENV_DIR environment variable is not set')
  }
  d.debug(`ENV_DIR: ${env.ENV_DIR}`)
  return (await readdir(env.ENV_DIR)).length > 0
}

type PrepareEnvironmentOptions = {
  skipEnvDirCheck?: boolean
  skipKubeContextCheck?: boolean
  skipDecrypt?: boolean
  skipAllPreChecks?: boolean
}

export const scriptName = 'otomi'

/**
 * Prepare environment when running an otomi command
 */
export const prepareEnvironment = async (options?: PrepareEnvironmentOptions): Promise<void> => {
  if (options?.skipAllPreChecks) return
  const d = terminal('common:prepareEnvironment')
  d.info('Checking environment')
  if (!options?.skipEnvDirCheck && (await isReadyEnvDir())) {
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
