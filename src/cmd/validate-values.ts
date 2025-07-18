import Ajv, { ValidateFunction } from 'ajv'
import { unset } from 'lodash'
import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { hfValues } from 'src/common/hf'
import { getFilename, loadYaml, rootDir } from 'src/common/utils'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { chalk } from 'zx'

const cmdName = getFilename(__filename)

const internalPaths: string[] = ['k8s', 'adminApps', 'teamApps']

// TODO: Accept json path to validate - on empty, validate all
export const validateValues = async (argv: HelmArguments = getParsedArgs(), envDir = env.ENV_DIR): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:validateValues`)
  // TODO: Make this return true or error tree
  // Create an end point function (when running otomi validate-values) to print current messages.
  d.log('Values validation STARTED on ', envDir)

  if (argv.l || argv.label) {
    const labelOpts = [...new Set([...(argv.l ?? []), ...(argv.label ?? [])])]
    throw new Error(`Cannot pass option '${labelOpts}'`)
  }

  const values = await hfValues({ filesOnly: true }, envDir)

  for (const internalPath of internalPaths) {
    unset(values, internalPath)
  }

  d.info('Loading values-schema.yaml')
  const valuesSchema = (await loadYaml(`${rootDir}/values-schema.yaml`)) as Record<string, any>
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
    d.error(JSON.stringify(validate.errors, null, 2))
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
