import Ajv, { DefinedError, ValidateFunction } from 'ajv'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { Argv } from 'yargs'
import { chalk } from 'zx'
import { OtomiDebugger, terminal } from '../common/debug'
import { Arguments, helmOptions } from '../common/helm-opts'
import { hfValues } from '../common/hf'
import { cleanupHandler, otomi, PrepareEnvironmentOptions } from '../common/setup'

const fileName = 'validate-values'
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
}

export const validateValues = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)
  debug.verbose('Values validation STARTED')

  if (argv.l || argv.label) {
    const labelOpts = [...new Set([...(argv.l ?? []), ...(argv.label ?? [])])]
    debug.exit(1, `Cannot pass option '${labelOpts}'`)
  }

  debug.verbose('Getting values')
  const hfVal = await hfValues()

  try {
    debug.verbose('Loading values-schema.yaml')
    const valuesSchema = load(readFileSync('./values-schema.yaml', 'utf-8')) as any
    debug.verbose('Initializing Ajv')
    const ajv = new Ajv({ allErrors: true, strict: false, strictTypes: false, verbose: true })
    debug.verbose('Compiling Ajv validation')
    let validate: ValidateFunction<unknown>
    try {
      validate = ajv.compile(valuesSchema)
    } catch (error) {
      debug.exit(1, `Schema is invalid: ${chalk.italic(error.message)}`)
      return
    }
    debug.verbose(`Validating values`)
    const val = validate(hfVal)
    if (val) {
      debug.verbose('Values validation SUCCESSFUL')
      process.exit(0)
    } else {
      validate.errors?.map((error: DefinedError) =>
        debug.error('%O', {
          keyword: error.keyword,
          dataPath: error.instancePath,
          schemaPath: error.schemaPath,
          params: error.params,
          message: error.message,
        }),
      )
      debug.exit(1, 'Values validation FAILED')
    }
  } catch (error) {
    debug.exit(1, error.message)
  }
}

export const module = {
  command: fileName,
  describe: 'Validate values for each cluster against JSON schema (takes target options)',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    await validateValues(argv, { skipKubeContextCheck: true })
  },
}

export default module
