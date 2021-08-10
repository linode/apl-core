#!/usr/bin/env -S ENV_DIR=${PWD}/tests/fixtures node --no-warnings --experimental-specifier-resolution=node --loader ts-node/esm
import { existsSync, symlinkSync } from 'fs'
import { fileURLToPath } from 'url'
import yargs, { Argv } from 'yargs'
import { hf } from './cmd/hf'
import { validateTemplates } from './cmd/validate-templates'
import { validateValues } from './cmd/validate-values'
import { x } from './cmd/x'
import { prepareEnvironment } from './common/setup'
import {
  BasicArguments,
  getFilename,
  getParsedArgs,
  OtomiDebugger,
  setParsedArgs,
  startingDir,
  terminal,
} from './common/utils'
import { basicOptions } from './common/yargs-opts'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

process.env.CI = '1'
process.env.IN_DOCKER = '1'

export type Arguments = BasicArguments

const setup = (): void => {
  process.env.AZURE_CLIENT_ID = 'somevalue'
  process.env.AZURE_CLIENT_SECRET = 'somesecret'
}

export const ciTests = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  if (!existsSync(`${startingDir}/env`)) symlinkSync(`${startingDir}/tests/fixtures`, `${startingDir}/env`)
  debug.log(`Running CI tests with values from ${`${startingDir}/tests/fixtures/`}`)

  const xCommand = 'opa test policies -v'
  debug.info(xCommand)
  const opaExitCode = await x({ ...argv, _: ['x', ...xCommand.split(' ')] })
  if (opaExitCode !== 0) {
    debug.error('Opa policies failed')
    process.exit(1)
  }

  await validateValues()

  debug.info('Running hf lint')
  await hf({ ...argv, args: ['lint'] })

  debug.info('Running validate-templates')
  await validateTemplates()

  // TODO: checkPolicies is disabled until it works again
  // debug.info('Check policies')
  // await checkPolicies(argv)
}

export const module = {
  command: cmdName,
  describe: 'CI tests',
  builder: (parser: Argv): Argv => parser,
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    setup()

    try {
      await ciTests()
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
