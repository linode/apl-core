#!/usr/bin/env -S ENV_DIR=${PWD}/tests/fixtures node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm
import { symlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import yargs, { Argv } from 'yargs'
import { hf } from './cmd/hf'
import { validateTemplates } from './cmd/validate-templates'
import { validateValues } from './cmd/validate-values'
import { x } from './cmd/x'
import { OtomiDebugger, terminal } from './common/debug'
import { BasicArguments, getFilename, setParsedArgs, startingDir } from './common/no-deps'
import { cleanupHandler } from './common/setup'
import { basicOptions } from './common/yargs-opts'

const fileName = getFilename(import.meta.url)
let debug: OtomiDebugger

process.env.CI = '1'
process.env.IN_DOCKER = '1'

export type Arguments = BasicArguments

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
}
/* eslint-enable no-useless-return */

const setup = (argv: Arguments): void => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
}

export const ciTests = async (argv: Arguments): Promise<void> => {
  const args = { ...argv }
  setup(args)
  symlinkSync(`${startingDir}/tests/fixtures`, `${startingDir}/env`)
  debug.log(`Validating ${`${startingDir}/env`} values`)

  const xCommand = 'opa test policies -v'
  debug.info(xCommand)
  const opaExitCode = await x({ ...argv, _: ['x', ...xCommand.split(' ')] }, { skipAll: true })
  if (opaExitCode !== 0) {
    debug.exit(1, 'Opa policies failed')
  }

  debug.info('Validate values')

  await validateValues(argv, { skipAll: true })

  debug.info('hf lint')
  await hf({ ...argv, args: ['lint'] }, { skipAll: true })

  debug.info('Validate templates')
  await validateTemplates(argv, { skipAll: true })

  // TODO: checkPolicies is disabled on old CLI bin/ci-tests.sh
  // debug.info('Check policies')
  // await checkPolicies(argv, { skipAll: true })
}

export const module = {
  command: fileName,
  describe: 'CI tests',
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    debug = terminal(fileName)

    try {
      await ciTests(argv)
    } catch (error) {
      debug.exit(1, error)
    }
  },
}

export default module

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await yargs([...process.argv].slice(1))
    .scriptName(fileName)
    .option(basicOptions)
    .command({ ...module, command: [module.command, '$0'] })
    .env('OTOMI')
    .parseAsync()
}
