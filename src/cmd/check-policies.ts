import { rmSync } from 'fs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfTemplate } from '../common/hf'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { getFilename, loadYaml, logLevel, LOG_LEVELS, setParsedArgs } from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
const outDir = '/tmp/otomi/conftest'
let debug: OtomiDebugger

const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  rmSync(outDir, { force: true, recursive: true })
}

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)
  if (options) await otomi.prepareEnvironment(options)
}

export const checkPolicies = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.info('Policy checking STARTED')

  const policiesFile = `${env.ENV_DIR}/env/policies.yaml`
  const settingsFile = `${env.ENV_DIR}/env/settings.yaml`
  const settings = loadYaml(settingsFile)
  if (settings?.otomi?.addons?.conftest && !settings?.otomi?.addons?.conftest.enabled) {
    debug.log('Skipping')
    return
  }
  debug.info('Generating k8s manifest for cluster')
  const template = await hfTemplate(argv, outDir)
  debug.debug(template)

  const extraArgs: string[] = []
  if (logLevel() === LOG_LEVELS.TRACE) extraArgs.push('--trace')
  if (env.CI) extraArgs.push('--no-color')

  debug.info('Checking manifest against policies')
  const confTestOutput = (
    await nothrow(
      $`conftest test ${extraArgs} --fail-on-warn --all-namespaces -d ${policiesFile} -p policies ${outDir}`,
    )
  ).stdout
  const cleanConftest: string = confTestOutput
    .replace(/^.*no policies found.*[\r\n]/gm, '')
    .replace(/^.*TRAC.*[\r\n]/gm, '')
    .replace(/^.*PASS.*[\r\n]/gm, '')
  if (cleanConftest.indexOf('FAIL') > -1) {
    debug.error(cleanConftest)
    process.exit(1)
  }
}

export const module = {
  command: cmdName,
  describe: 'Check if generated manifests adhere to defined OPA policies',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await checkPolicies(argv, { skipKubeContextCheck: true })
  },
}

export default module
