import Ajv, { DefinedError, ValidateFunction } from 'ajv'
import { unset } from 'lodash'
import { Argv } from 'yargs'
import { chalk } from 'zx'
import { prepareEnvironment } from '../common/cli'
import { terminal } from '../common/debug'
import { hfValues } from '../common/hf'
import { getFilename, loadYaml, rootDir } from '../common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)

const internalPaths: string[] = ['k8s', 'services', 'teamConfig.services']

// TODO: Accept json path to validate - on empty, validate all
export const validateValues = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:validateValues`)
  // TODO: Make this return true or error tree
  // Create an end point function (when running otomi validate-values) to print current messages.
  const argv: HelmArguments = getParsedArgs()
  d.log('Values validation STARTED')

  if (argv.l || argv.label) {
    const labelOpts = [...new Set([...(argv.l ?? []), ...(argv.label ?? [])])]
    throw new Error(`Cannot pass option '${labelOpts}'`)
  }

  const values = await hfValues({ filesOnly: true })

  // eslint-disable-next-line no-restricted-syntax
  for (const internalPath of internalPaths) {
    unset(values, internalPath)
  }

  d.info('Loading values-schema.yaml')
  const valuesSchema = loadYaml(`${rootDir}/values-schema.yaml`) as Record<string, any>
  d.debug('Initializing Ajv')
  const ajv = new Ajv({ allErrors: true, strict: false, strictTypes: false, verbose: true })
  d.debug('Compiling Ajv validation')
  let validate: ValidateFunction<unknown>
  try {
    validate = ajv.compile(valuesSchema)
  } catch (error) {
    throw new Error(`Schema is invalid: ${chalk.italic(error.message)}`)
  }
  d.info(`Validating values`)
  const val = validate(values)
  if (val) {
    d.log('Values validation SUCCESSFUL')
  } else {
    validate.errors?.map((error: DefinedError) =>
      d.error('%O', {
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

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await validateValues()
  },
}
