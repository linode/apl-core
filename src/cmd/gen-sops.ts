import { existsSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { chalk } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { BasicArguments, getFilename, gucci, loadYaml, setParsedArgs, startingDir } from '../common/utils'

export interface Arguments extends BasicArguments {
  dryRun: boolean
}

const cmdName = getFilename(import.meta.url)
let debug: OtomiDebugger

const providerMap = {
  aws: 'kms',
  azure: 'azure_keyvault',
  google: 'gcp_kms',
  vault: 'hc_vault_transit_uri',
}

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)

  if (options) await otomi.prepareEnvironment(options)
}

export const genSops = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, { ...options, skipEvaluateSecrets: true, skipDecrypt: true, skipKubeContextCheck: true })

  const settingsFile = `${env.ENV_DIR}/env/settings.yaml`
  const settingsVals = loadYaml(settingsFile)
  const provider: string | undefined = settingsVals?.kms?.sops?.provider
  if (!provider) throw new Error('No sops information given. Assuming no sops enc/decryption needed.')

  const targetPath = `${env.ENV_DIR}/.sops.yaml`
  const templatePath = `${startingDir}/tpl/.sops.yaml.gotmpl`
  const kmsProvider = providerMap[provider] as string
  const kmsKeys = settingsVals.kms.sops[provider].keys as string

  const obj = {
    provider: kmsProvider,
    keys: kmsKeys,
  }

  debug.log(chalk.magenta(`Creating sops file for provider ${provider}`))

  const output = await gucci(templatePath, obj)
  if (argv.dryRun) {
    debug.log(output)
  } else {
    writeFileSync(`${targetPath}`, output)
    debug.log(`gen-sops is done and the configuration is written to: ${targetPath}`)
  }

  if (!env.CI) {
    if (!existsSync(`${env.ENV_DIR}/.secrets`)) {
      debug.error(`Expecting ${env.ENV_DIR}/.secrets to exist and hold credentials for SOPS`)
      return
    }
  }
  if (provider === 'google') {
    if (env.GCLOUD_SERVICE_KEY) {
      debug.log('Creating gcp-key.json for vscode.')
      writeFileSync(`${env.ENV_DIR}/gcp-key.json`, JSON.stringify(env.GCLOUD_SERVICE_KEY, null, 2))
    } else {
      debug.log('`GCLOUD_SERVICE_KEY` environment variable is not set, cannot create gcp-key.json.')
    }
  }
}

export const module = {
  command: cmdName,
  describe: undefined,
  builder: (parser: Argv): Argv =>
    parser.options({
      'dry-run': {
        alias: ['d'],
        boolean: true,
        default: false,
        hidden: true,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    try {
      await genSops(argv, { skipKubeContextCheck: true })
    } catch (error) {
      debug.error(error.message)
      process.exit(0)
    }
  },
}

export default module
