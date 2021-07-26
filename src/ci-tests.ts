#!/usr/bin/env -S node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm
import { renameSync, symlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import yargs, { Argv } from 'yargs'
import { checkPolicies } from './cmd/check-policies'
import { hf } from './cmd/hf'
import { validateTemplates } from './cmd/validate-templates'
import { validateValues } from './cmd/validate-values'
import { x } from './cmd/x'
import { OtomiDebugger, terminal } from './common/debug'
import { BasicArguments, ENV, getFilename } from './common/no-deps'
import { cleanupHandler } from './common/setup'
import { basicOptions } from './common/yargs-opts'

const fileName = getFilename(import.meta.url)
let debug: OtomiDebugger

process.env.CI = '1'
process.env.IN_DOCKER = '1'

export type Arguments = BasicArguments

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = (argv: Arguments): void => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
}

export const ciTests = async (argv: Arguments): Promise<void> => {
  const args = { ...argv }
  setup(args)

  ENV.DIR = `${ENV.PWD}/tests/fixtures`
  renameSync(`${ENV.PWD}/env`, `${ENV.PWD}/env2`)
  symlinkSync(`${ENV.PWD}/env`, ENV.DIR)
  debug.log(`Validating ${ENV.DIR} values`)

  const xCommand = 'opa test policies -v'
  debug.verbose(xCommand)
  const opaExitCode = await x({ ...argv, _: ['x', ...xCommand.split(' ')] }, { skipAll: true })
  if (opaExitCode !== 0) {
    debug.exit(1, 'Opa policies failed')
  }

  debug.verbose('Validate values')

  await validateValues(argv, { skipAll: true })

  debug.verbose('hf lint')
  await hf({ ...argv, args: ['lint'] }, { skipAll: true })

  debug.verbose('Validate templates')
  await validateTemplates(argv, { skipAll: true })
  debug.verbose('Check policies')
  await checkPolicies(argv, { skipAll: true })

  renameSync(`${ENV.PWD}/env2`, `${ENV.PWD}/env`)
}

export const module = {
  command: fileName,
  describe: 'CI tests',
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    ENV.PARSED_ARGS = argv
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
