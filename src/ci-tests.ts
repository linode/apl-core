#!/usr/bin/env -S ENV_DIR=${PWD}/tests/fixtures node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm
import { existsSync, symlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import yargs, { Argv } from 'yargs'
import { hf } from './cmd/hf'
import { validateTemplates } from './cmd/validate-templates'
import { validateValues } from './cmd/validate-values'
import { x } from './cmd/x'
import { OtomiDebugger, terminal } from './common/debug'
import { cleanupHandler } from './common/setup'
import { BasicArguments, getFilename, setParsedArgs, startingDir } from './common/utils'
import { basicOptions } from './common/yargs-opts'
import { source } from './common/zx-enhance'

const cmdName = getFilename(import.meta.url)
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
  if (argv._[0] === cmdName) cleanupHandler(() => cleanup(argv))
}

export const ciTests = async (argv: Arguments): Promise<void> => {
  const args = { ...argv }
  setup(args)
  if (!existsSync(`${startingDir}/env`)) symlinkSync(`${startingDir}/tests/fixtures`, `${startingDir}/env`)
  debug.log(`Validating ${`${startingDir}/env`} values`)
  await source(`${startingDir}/env/.env`)
  const xCommand = 'opa test policies -v'
  debug.info(xCommand)
  const opaExitCode = await x({ ...argv, _: ['x', ...xCommand.split(' ')] }, { skipAllPreChecks: true })
  if (opaExitCode !== 0) {
    debug.error('Opa policies failed')
    process.exit(1)
  }

  debug.info('Validate values')

  await validateValues(argv, { skipAllPreChecks: true })

  debug.info('hf lint')
  await hf({ ...argv, args: ['lint'] }, { skipAllPreChecks: true })

  debug.info('Validate templates')
  await validateTemplates(argv, { skipAllPreChecks: true })

  // TODO: checkPolicies is disabled on old CLI bin/ci-tests.sh
  // debug.info('Check policies')
  // await checkPolicies(argv, { skipAll: true })
}

export const module = {
  command: cmdName,
  describe: 'CI tests',
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    debug = terminal(cmdName)

    try {
      await ciTests(argv)
    } catch (error) {
      debug.error(error)
      process.exit(1)
    }
  },
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await yargs([...process.argv].slice(1))
    .scriptName(cmdName)
    .option(basicOptions)
    .command({ ...module, command: [module.command, '$0'] })
    .env('OTOMI')
    .parseAsync()
}
