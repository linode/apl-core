import { existsSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $, chalk, nothrow } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { BasicArguments, ENV, loadYaml } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { askYesNo } from '../common/zx-enhance'

export interface Arguments extends BasicArguments {
  dryRun: boolean
}

const fileName = 'gen-sops'
let debug: OtomiDebugger

const providerMap = {
  aws: 'kms',
  azure: 'azure_keyvault',
  google: 'gcp_kms',
  vault: 'hc_vault_transit_uri',
}

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(options)
}

export const genSops = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, { ...options, skipEvaluateSecrets: true, skipDecrypt: true, skipKubeContextCheck: true })

  const settingsFile = `${ENV.DIR}/env/settings.yaml`
  const settingsVals = loadYaml(settingsFile)
  const provider: string | undefined = settingsVals?.kms?.sops?.provider
  if (!provider) throw new Error('No sops information given. Assuming no sops enc/decryption needed.')

  const targetPath = `${ENV.DIR}/.sops.yaml`
  if (existsSync(targetPath)) {
    const overwrite = await askYesNo(`${targetPath} already exists, do you want to overwrite?`, { defaultYes: false })
    if (!overwrite) return
  }
  const templatePath = `${ENV.PWD}/tpl/.sops.yaml.gotmpl`
  const kmsProvider = providerMap[provider]
  const kmsKeys = settingsVals.kms.sops[provider].keys

  const obj = {
    provider: kmsProvider,
    keys: kmsKeys,
  }

  debug.log(chalk.magenta(`Creating sops file for provider ${provider}`))
  const gucciArgs = Object.entries(obj).map(([k, v]) => `-s ${k}='${v ?? ''}'`)
  const quoteBackup = $.quote
  $.quote = (v) => v
  const processOutput = await nothrow($`gucci ${gucciArgs} ${templatePath}`)
  $.quote = quoteBackup
  const output = processOutput.stdout
  if (argv.dryRun) {
    debug.log(output)
  } else {
    writeFileSync(`${targetPath}`, output)
    debug.log(`gen-sops is done and the configuration is written to: ${targetPath}`)
  }

  if (!ENV.isCI) {
    if (!existsSync(`${ENV.DIR}/.secrets`)) {
      debug.error(`Expecting ${ENV.DIR}/.secrets to exist and hold credentials for SOPS`)
      return
    }
  }
  if (provider === 'google') {
    if (process.env.GCLOUD_SERVICE_KEY) {
      debug.log('Creating gcp-key.json for vscode.')
      writeFileSync(`${ENV.DIR}/gcp-key.json`, JSON.stringify(JSON.parse(process.env.GCLOUD_SERVICE_KEY), null, 2))
    } else {
      debug.log('`GCLOUD_SERVICE_KEY` environment variable is not set, cannot create gcp-key.json.')
    }
  }
}

export const module = {
  command: fileName,
  describe: '',
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
    ENV.PARSED_ARGS = argv
    try {
      await genSops(argv, {})
    } catch (error) {
      debug.exit(0, error.message)
    }
  },
}

export default module
