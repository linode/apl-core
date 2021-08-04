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
  if (!env.CI) {
    const secretPath = `${env.ENV_DIR}/.secrets`
    if (existsSync(secretPath)) {
      await source(secretPath)
    } else {
      debug.warn('%s\n', `Unable to find the '${secretPath}' file (while not in CI).`)
    }
  }
}

export default evaluateSecrets
