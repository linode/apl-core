import { rmSync } from 'fs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { hfTemplate } from '../common/hf'
import { loadYaml, LOG_LEVEL, LOG_LEVELS, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { env } from '../common/validators'
import { Arguments, helmOptions } from '../common/yargs-opts'

const fileName = 'check-policies'
const outDir = '/tmp/otomi/conftest'
let debug: OtomiDebugger

const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  rmSync(outDir, { force: true, recursive: true })
}

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)
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
  if (LOG_LEVEL() === LOG_LEVELS.TRACE) extraArgs.push('--trace')
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
    debug.exit(1, cleanConftest)
  }
}

export const module = {
  command: fileName,
  describe: 'Check if generated manifests adhere to defined OPA policies',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await checkPolicies(argv, { skipKubeContextCheck: true })
  },
}

export default module
