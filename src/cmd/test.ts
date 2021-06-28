import { unlinkSync, writeFileSync } from 'fs'
import { Argv } from 'yargs'
import { $ } from 'zx'
import { cleanupHandler, ENV, hf, otomi, OtomiDebugger, PrepareEnvironmentOptions, terminal } from '../common/index'
import { Arguments, helmOptions } from '../helm.opts'
import { diff } from './diff'
import { lint } from './lint'
import { validateTemplates } from './validate-templates'

const fileName = 'test'
const tmpFile = '/tmp/otomi/test.yaml'
let debug: OtomiDebugger

const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
  unlinkSync(tmpFile)
}

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
}

export const test = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  debug.log(await lint(argv))
  debug.log(await validateTemplates(argv))
  // await checkPolicies(argv)

  const hfOutput = await hf({ fileOpts: 'helmfile.tpl/helmfile-init.yaml', args: ['template', '--skip-deps'] })
  writeFileSync(tmpFile, hfOutput.replace(/^.*basePath=.*$/gm, ''))
  debug.log((await $`kubectl apply --dry-run=client -f ${tmpFile}`).stdout)

  const diffOutput = (await diff(argv)).replaceAll('../env', ENV.DIR)
  debug.log(diffOutput)
}

export const module = {
  command: fileName,
  describe: 'Run tests against the target cluster',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    await test(argv, { skipKubeContextCheck: true })
  },
}

export default module
