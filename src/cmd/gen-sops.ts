import { existsSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
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
  const settingsVals = loadYaml(settingsFile) as Record<string, any>
  // TODO: Use validate values to validate tree at this specific point
  // validateValues('kms.sops.provider')
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

  const exists = existsSync(targetPath)
  debug.debug('sops file already exists')
  debug.log(`Creating sops file for provider ${provider}`)

  const output = (await gucci(templatePath, obj)) as string

  // TODO: Remove when validate-values can validate subpaths
  if (!output) return

  if (argv.dryRun) {
    debug.log(output)
  } else {
    writeFileSync(targetPath, output)
    debug.log(`gen-sops is done and the configuration is written to: ${targetPath}`)
  }

  if (!env.CI) {
    const secretPath = `${env.ENV_DIR}/.secrets`
    if (exists && !existsSync(secretPath)) {
      throw new Error(`Expecting ${secretPath} to exist and hold credentials for SOPS!`)
    }
  }
  if (provider === 'google') {
    let serviceKeyJson = env.GCLOUD_SERVICE_KEY
    if (!serviceKeyJson) {
      const values = await hfValues()
      if (values) serviceKeyJson = JSON.parse(values?.kms?.sops?.google?.accountJson)
    }

    if (serviceKeyJson) {
      debug.log('Creating gcp-key.json for vscode.')
      writeFileSync(`${env.ENV_DIR}/gcp-key.json`, JSON.stringify(serviceKeyJson))
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
    await prepareEnvironment({ skipDecrypt: true, skipKubeContextCheck: true })
    await genSops()
  },
}

export default module
