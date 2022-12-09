import { JSONSchema } from '@apidevtools/json-schema-ref-parser'
import { dump } from 'js-yaml'
import { each, get, isEmpty, set } from 'lodash'
import omitDeep from 'omit-deep-lodash'
import { hfValues } from 'src/common/hf'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { terminal } from '../common/debug'
import { extract, extractArray, flattenObject, getFilename, getValuesSchema } from '../common/utils'
import { BasicArguments, getParsedArgs, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)

interface Arguments extends BasicArguments {
  all?: boolean
}

const defaults = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:defaults`)
  const argv: Arguments = getParsedArgs()
  d.info(`Get defaults, all: ${argv.all}`)
  const schema = await getValuesSchema()
  let def = extract(schema, 'default', (val, parent: JSONSchema): any => {
    // skip arrays as those are unknown
    if (parent?.items) return undefined
    return val
  })
  def = omitDeep(def, 'patternProperties')
  if (argv.all) return console.log(dump(def))
  // only return defaults for which we have matching paths from values
  const values = await hfValues({ filesOnly: true })
  if (isEmpty(values)) throw new Error('No values exist yet. Empty ENV_DIR?')
  const required = extract(schema, 'required')
  const flattenedDefaults = flattenObject(def)
  const retDef = {}
  each(flattenedDefaults, (val, path) => {
    const parentPath = path.substring(0, path.lastIndexOf('.'))
    const parentRequiredObj = get(required, `${parentPath}`, {})
    const parentRequired = extractArray(parentRequiredObj)
    const parentExists = get(values, parentPath)
    const prop = path.split('.').pop()
    if (parentExists || parentRequired.includes(prop)) set(retDef, path, val)
  })
  return console.log(dump(retDef))
}

export const module = {
  command: cmdName,
  describe: 'Show schema defaults',
  builder: (parser: Argv): Argv =>
    parser.options({
      all: {
        boolean: true,
        default: false,
        describe:
          'When set it shows all schema defaults, else just the defaults around input values (requires ENV_DIR to be set).',
      },
    }),
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    if (argv.all) await prepareEnvironment({ skipEnvDirCheck: argv.all, skipDecrypt: true, skipKubeContextCheck: true })
    await defaults()
  },
}
