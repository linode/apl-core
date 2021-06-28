import { existsSync } from 'fs'
import { terminal } from './debug'
import { ENV } from './no-deps'
import { source } from './zx-enhance'

/**
 * Evaluate secrets, first check if .sops.yaml exists, then source the secrets path - which should exist
 * @param debug
 */
export const evaluateSecrets = async (debug = terminal('evaluateSecrets')): Promise<void> => {
  if (!existsSync(`${ENV.DIR}/.sops.yaml`)) {
    debug.log(`Info: The 'secrets.*.yaml files' are not decrypted, because ${ENV.DIR}/.sops.yaml file is not present`)
  }
  const secretPath = `${ENV.DIR}/.secrets`
  try {
    await source(secretPath)
  } catch (error) {
    debug.exit(
      1,
      `Unable to find the '${secretPath}' file.`,
      `Please follow to documentation: https://github.com/redkubes/otomi-core`,
    )
  }
}

export default evaluateSecrets
