import { unlinkSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $ } from 'zx'
import { env } from '../common/envalid'
import { hf } from '../common/hf'
import { cleanupHandler, prepareEnvironment } from '../common/setup'
import { getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'
import { ProcessOutputTrimmed } from '../common/zx-enhance'
import { diff } from './diff'
import { lint } from './lint'
import { validateTemplates } from './validate-templates'

const cmdName = getFilename(import.meta.url)
const tmpFile = '/tmp/otomi/test.yaml'
const debug: OtomiDebugger = terminal(cmdName)

const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  unlinkSync(tmpFile)
}

const setup = (argv: Arguments): void => {
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
}

export const test = async (): Promise<void> => {
  debug.log(await lint())
  debug.log(await validateTemplates())
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

  const diffOutput = await diff()
  debug.log(diffOutput.stdout.replaceAll('../env', env.ENV_DIR))
  debug.error(diffOutput.stderr.replaceAll('../env', env.ENV_DIR))
}

export const module = {
  command: cmdName,
  describe: 'Run tests against the target cluster',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    setup(argv)
    await test()
  },
}

export default module
