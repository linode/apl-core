import { chalk } from 'zx'
import { env } from './envalid'
import { unsetValuesFile, unsetValuesFileSync } from './repo'

chalk.level = 2

export const scriptName = 'otomi'

/**
 * Prepare environment when running an otomi command
 */
export const prepareEnvironment = async (): Promise<void> => {
  await unsetValuesFile(env.ENV_DIR)
}

/**
 * Cleanup trap on exit - any handler function MUST be synchronous
 * @param handler cleanup function set per command
 */
export const cleanupHandler = (handler: () => any) => {
  process.on('exit', (code) => {
    handler()
    unsetValuesFileSync(env.ENV_DIR)
    process.exit(code)
  })
}
