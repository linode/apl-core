import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { pathExists } from 'fs-extra'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevel, logLevels, terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { hfTemplate } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { BasicArguments, getParsedArgs, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'

const cmdName = getFilename(__filename)
const outDir = '/tmp/otomi/conftest'

const cleanup = (argv: BasicArguments): void => {
  if (argv.skipCleanup) return
  rmSync(outDir, { force: true, recursive: true })
}

const setup = (argv: BasicArguments): void => {
  cleanupHandler(() => cleanup(argv))
}

export const checkPolicies = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:checkPolicies`)
  const argv: BasicArguments = getParsedArgs()
  setup(argv)
  d.log('Policy checking STARTED')

  const policiesFile = `${env.ENV_DIR}/env/policies.yaml`
  const parametersFile = `${outDir}/parameters.yaml`
  if (!(await pathExists(outDir))) mkdirSync(outDir)
  // the policy parameters file's root prop is 'policies:', but conftest expects it to be served with 'parameters:'
  writeFileSync(parametersFile, readFileSync(policiesFile, 'utf8').replace('policies:', 'parameters:'))
  d.info('Generating k8s manifests for cluster')
  await hfTemplate(argv, outDir, { stdout: d.stream.debug })

  const extraArgs: string[] = []
  if (logLevel() === logLevels.TRACE) extraArgs.push('--trace')

  d.info('Checking manifests for policy violations')
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
  } else d.log('Policy checks OK!')
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
