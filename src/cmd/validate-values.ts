import Ajv, { DefinedError, ValidateFunction } from 'ajv'
import { unset } from 'lodash'
import { Argv } from 'yargs'
import { chalk } from 'zx'
import { hfValues } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import { getFilename, getParsedArgs, loadYaml, OtomiDebugger, rootDir, setParsedArgs, terminal } from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

const internalPaths: string[] = ['apps', 'k8s', 'services', 'sops', 'teamConfig.services']

// TODO: Accept json path to validate - on empty, validate all
export const validateValues = async (): Promise<void> => {
  // TODO: Make this return true or error tree
  // Create an end point function (when running otomi validate-values) to print current messages.
  const argv: Arguments = getParsedArgs()
  debug.log('Values validation STARTED')

  if (argv.l || argv.label) {
    const labelOpts = [...new Set([...(argv.l ?? []), ...(argv.label ?? [])])]
    throw new Error(`Cannot pass option '${labelOpts}'`)
  }

  const values = await hfValues({ filesOnly: true })

  // eslint-disable-next-line no-restricted-syntax
  for (const internalPath of internalPaths) {
    unset(values, internalPath)
  }

  debug.info('Loading values-schema.yaml')
  const valuesSchema = loadYaml(`${rootDir}/values-schema.yaml`) as Record<string, any>
  debug.debug('Initializing Ajv')
  const ajv = new Ajv({ allErrors: true, strict: false, strictTypes: false, verbose: true })
  debug.debug('Compiling Ajv validation')
  let validate: ValidateFunction<unknown>
  try {
    validate = ajv.compile(valuesSchema)
  } catch (error) {
    throw new Error(`Schema is invalid: ${chalk.italic(error.message)}`)
  }
  debug.info(`Validating values`)
  const val = validate(values)
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
    throw new Error('Values validation FAILED')
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
