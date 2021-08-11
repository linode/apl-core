import { existsSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { chalk } from 'zx'
import { env } from '../common/envalid'
import { prepareEnvironment } from '../common/setup'
import {
  BasicArguments,
  getFilename,
  getParsedArgs,
  gucci,
  loadYaml,
  OtomiDebugger,
  setParsedArgs,
  startingDir,
  terminal,
} from '../common/utils'

export interface Arguments extends BasicArguments {
  dryRun: boolean
}

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

const providerMap = {
  aws: 'kms',
  azure: 'azure_keyvault',
  google: 'gcp_kms',
  vault: 'hc_vault_transit_uri',
}

export const genSops = async (): Promise<void> => {
  const argv: BasicArguments = getParsedArgs()
  const settingsFile = `${env.ENV_DIR}/env/settings.yaml`
  const settingsVals = loadYaml(settingsFile)
  const provider: string | undefined = settingsVals?.kms?.sops?.provider
  if (!provider) {
    debug.warn('No sops information given. Assuming no sops enc/decryption needed. Be careful!')
    return
  }

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
    const secretPath = `${env.ENV_DIR}/.secrets`
    if (!existsSync(secretPath)) {
      debug.error(`Expecting ${secretPath} to exist and hold credentials for SOPS`)
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
    await prepareEnvironment({ skipEvaluateSecrets: true, skipDecrypt: true, skipKubeContextCheck: true })
    await genSops()
  },
}

export default module
