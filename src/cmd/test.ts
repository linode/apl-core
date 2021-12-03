import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $ } from 'zx'
import { cleanupHandler, prepareEnvironment } from '../common/cli'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hf } from '../common/hf'
import { getFilename } from '../common/utils'
import { HelmArguments, getParsedArgs, helmOptions, setParsedArgs } from '../common/yargs'
import { ProcessOutputTrimmed } from '../common/zx-enhance'
import { diff } from './diff'
import { lint } from './lint'
import { validateTemplates } from './validate-templates'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)
const tmpFile = '/tmp/otomi/test.yaml'
let debug: OtomiDebugger

const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  if (existsSync(tmpFile)) unlinkSync(tmpFile)
}

const setup = (argv: HelmArguments): void => {
  cleanupHandler(() => cleanup(argv))
  debug = terminal(cmdName)
}

const test = async (): Promise<void> => {
  setup(getParsedArgs())
  await validateValues()
  await lint()
  await validateTemplates()
  // await checkPolicies(argv)

  const output: ProcessOutputTrimmed = await hf({
    fileOpts: 'helmfile.tpl/helmfile-init.yaml',
    args: ['template', '--skip-deps'],
  })

  if (output.exitCode > 0) {
    throw new Error(output.stderr)
  } else if (output.stderr.length > 0) {
    debug.error(output.stderr)
  }
  const hfOutput: string = output.stdout
  writeFileSync(tmpFile, hfOutput.replace(/^.*basePath=.*$/gm, ''))
  debug.log((await $`kubectl apply --dry-run=client -f ${tmpFile}`).stdout)

  const diffOutput = await diff()
  debug.log(diffOutput.stdout.replaceAll('../env', env().ENV_DIR))
  debug.error(diffOutput.stderr.replaceAll('../env', env().ENV_DIR))
}

export const module = {
  command: cmdName,
  describe: 'Run tests against the target cluster',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await test()
  },
}
