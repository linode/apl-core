import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import {
  BasicArguments,
  cleanupHandler,
  otomi,
  OtomiDebugger,
  PrepareEnvironmentOptions,
  terminal,
} from '../common/index'

const fileName = 'x'
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: BasicArguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
}

export const x = async (argv: BasicArguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  const commands = argv._.slice(1).join(' ')
  const output = await nothrow($`${commands}`)
  output.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => debug.log(line))
  output.stderr
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => debug.error(line))
  process.exit(output.exitCode)
}

export const module = {
  command: fileName,
  describe: 'Execute command in container',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    await x(argv, { skipKubeContextCheck: true })
  },
}

export default module
