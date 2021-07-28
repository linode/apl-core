import { unlinkSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $ } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hf } from '../common/hf'
import { getFilename, setParsedArgs } from '../common/no-deps'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'
import { Arguments, helmOptions } from '../common/yargs-opts'
import { ProcessOutputTrimmed } from '../common/zx-enhance'
import { diff } from './diff'
import { lint } from './lint'
import { validateTemplates } from './validate-templates'

const fileName = getFilename(import.meta.url)
const tmpFile = '/tmp/otomi/test.yaml'
let debug: OtomiDebugger

const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  unlinkSync(tmpFile)
}

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(options)
}

export const test = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  debug.log(await lint(argv))
  debug.log(await validateTemplates(argv))
  // await checkPolicies(argv)

  const output: ProcessOutputTrimmed = await hf({
    fileOpts: 'helmfile.tpl/helmfile-init.yaml',
    args: ['template', '--skip-deps'],
  })

  if (output.exitCode > 0) {
    debug.error(output.stderr)
    process.exit(output.exitCode)
  } else if (output.stderr.length > 0) {
    debug.error(output.stderr)
  }
  const hfOutput: string = output.stdout
  writeFileSync(tmpFile, hfOutput.replace(/^.*basePath=.*$/gm, ''))
  debug.log((await $`kubectl apply --dry-run=client -f ${tmpFile}`).stdout)

  const diffOutput = await diff(argv)
  debug.log(diffOutput.stdout.replaceAll('../env', env.ENV_DIR))
  debug.error(diffOutput.stderr.replaceAll('../env', env.ENV_DIR))
}

export const module = {
  command: fileName,
  describe: 'Run tests against the target cluster',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await test(argv, { skipKubeContextCheck: true })
  },
}

export default module
