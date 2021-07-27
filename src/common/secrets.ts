import { existsSync } from 'fs'
import { terminal } from './debug'
import { env } from './envalid'
import { source } from './zx-enhance'

/**
 * Evaluate secrets, first check if .sops.yaml exists, then source the secrets path - which should exist
 */
export const evaluateSecrets = async (): Promise<void> => {
  const debug = terminal('evaluateSecrets')
  if (!existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    debug.log(
      `Info: The 'secrets.*.yaml files' are not decrypted, because ${env.ENV_DIR}/.sops.yaml file is not present`,
    )
  }
  const secretPath = `${env.ENV_DIR}/.secrets`
  try {
    await source(secretPath)
  } catch (error) {
    debug.error('%s\n', `Unable to find the '${secretPath}' file.`, `Continuing without local secrets`)
  }
}

export default evaluateSecrets
