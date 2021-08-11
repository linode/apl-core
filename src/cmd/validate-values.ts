import Ajv, { DefinedError, ValidateFunction } from 'ajv'
import { Argv } from 'yargs'
import { chalk } from 'zx'
import { hfValues } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import {
  deletePropertyPath,
  getFilename,
  getParsedArgs,
  loadYaml,
  OtomiDebugger,
  setParsedArgs,
  terminal,
} from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

const internalPaths: string[] = ['apps', 'k8s', 'services', 'sops', 'teamConfig.services']

export const validateValues = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  debug.log('Values validation STARTED')

  if (argv.l || argv.label) {
    const labelOpts = [...new Set([...(argv.l ?? []), ...(argv.label ?? [])])]
    debug.error(`Cannot pass option '${labelOpts}'`)
    process.exit(1)
  }

  debug.info('Getting values')
  const chartValues = await hfValues()

  // eslint-disable-next-line no-restricted-syntax
  for (const internalPath of internalPaths) {
    deletePropertyPath(chartValues, internalPath)
  }

  try {
    debug.info('Loading values-schema.yaml')
    const valuesSchema = loadYaml('./values-schema.yaml')
    debug.debug('Initializing Ajv')
    const ajv = new Ajv({ allErrors: true, strict: false, strictTypes: false, verbose: true })
    debug.debug('Compiling Ajv validation')
    let validate: ValidateFunction<unknown>
    try {
      validate = ajv.compile(valuesSchema)
    } catch (error) {
      debug.error(`Schema is invalid: ${chalk.italic(error.message)}`)
      process.exit(1)
    }
    debug.info(`Validating values`)
    const val = validate(chartValues)
    if (val) {
      debug.log('Values validation SUCCESSFUL')
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
      debug.error('Values validation FAILED')
      process.exit(1)
    }
  } catch (error) {
    debug.error(error.message)
    process.exit(1)
  }
}

export const module = {
  command: cmdName,
  describe: 'Validate values for each cluster against JSON schema (takes target options)',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await validateValues()
  },
}

export default module
