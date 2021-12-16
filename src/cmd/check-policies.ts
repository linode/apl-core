import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { cleanupHandler, prepareEnvironment } from '../common/cli'
import { logLevel, logLevels, OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfTemplate } from '../common/hf'
import { getFilename, loadYaml } from '../common/utils'
import { BasicArguments, getParsedArgs, helmOptions, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)
const outDir = '/tmp/otomi/conftest'
const debug: OtomiDebugger = terminal(cmdName)

const cleanup = (argv: BasicArguments): void => {
  if (argv.skipCleanup) return
  rmSync(outDir, { force: true, recursive: true })
}

const setup = (argv: BasicArguments): void => {
  cleanupHandler(() => cleanup(argv))
}

export const checkPolicies = async (): Promise<void> => {
  const argv: BasicArguments = getParsedArgs()
  setup(argv)
  debug.log('Policy checking STARTED')

  const policiesFile = `${env().ENV_DIR}/env/policies.yaml`
  const parametersFile = `${outDir}/parameters.yaml`
  if (!existsSync(outDir)) mkdirSync(outDir)
  // the policy parameters file's root prop is 'policies:', but conftest expects it to be served with 'parameters:'
  writeFileSync(parametersFile, readFileSync(policiesFile, 'utf8').replace('policies:', 'parameters:'))
  const settingsFile = `${env().ENV_DIR}/env/settings.yaml`
  const settings = loadYaml(settingsFile)
  if (settings?.otomi?.addons?.conftest && !settings?.otomi?.addons?.conftest.enabled) {
    debug.log('Skipping')
    return
  }
  debug.info('Generating k8s manifests for cluster')
  await hfTemplate(argv, outDir, { stdout: debug.stream.debug })

  const extraArgs: string[] = []
  if (logLevel() === logLevels.TRACE) extraArgs.push('--trace')
  if (env().CI) extraArgs.push('--no-color')

  debug.info('Checking manifests for policy violations')
  const confTestOutput = (
    await nothrow(
      $`conftest test ${extraArgs} --fail-on-warn --all-namespaces -d ${parametersFile} -p policies ${outDir}`,
    )
  ).stdout
  const cleanConftest: string = confTestOutput
    .replace(/^.*no policies found.*[\r\n]/gm, '')
    .replace(/^.*TRAC.*[\r\n]/gm, '')
    .replace(/^.*PASS.*[\r\n]/gm, '')
  if (cleanConftest.indexOf('FAIL') > -1) {
    throw new Error(cleanConftest)
  } else debug.log('Policy checks OK!')
}

export const module = {
  command: cmdName,
  describe: 'Check if generated manifests adhere to defined OPA policies',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await checkPolicies()
  },
}
