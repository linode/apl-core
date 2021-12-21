/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { diff } from 'deep-diff'
import { cloneDeep, get, isEqual, set, unset } from 'lodash'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { OtomiDebugger, terminal } from '../common/debug'
import { hfValues } from '../common/hf'
import { getFilename, gucci, loadYaml, rootDir } from '../common/utils'
import { writeValues } from '../common/values'
import { BasicArguments, getParsedArgs, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

interface Arguments extends BasicArguments {
  dryRun?: boolean
}

interface Change {
  version: number
  deletions?: Array<string>
  locations?: Array<{
    [oldLocation: string]: string
  }>
  mutations?: Array<{
    [preMutation: string]: string
  }>
}

export type Changes = Array<Change>

export const moveGivenJsonPath = (values: Record<string, any>, lhs: string, rhs: string): void => {
  const moveValue = get(values, lhs, 'err!')
  if (unset(values, lhs)) set(values, rhs, moveValue)
}

export function filterChanges(version: number, changes: Changes): Changes {
  return changes.filter((c) => c.version - version > 0)
}

export const applyChanges = async (values: Record<string, any>, changes: Changes): Promise<Record<string, any>> => {
  const result = cloneDeep(values)
  for (const c of changes) {
    c.deletions?.forEach((del) => unset(result, del))
    c.locations?.forEach((loc) => moveGivenJsonPath(result, Object.keys(loc)[0], Object.values(loc)[0]))

    if (c.mutations)
      for (const mut of c.mutations) {
        const path = Object.keys(mut)[0]
        const tmpl = `{{ ${Object.values(mut)[0]} .prev }}`
        const prev = get(values, path)
        const ret = await gucci(tmpl, { prev })
        set(result, path, ret)
      }
    Object.assign(result, { version: c.version })
  }
  return result
}

/**
 * Differences are reported as one or more change records. Change records have the following structure:

  kind - indicates the kind of change; will be one of the following:
  N - indicates a newly added property/element
  D - indicates a property/element was deleted
  E - indicates a property/element was edited
  A - indicates a change occurred within an array
  path - the property path (from the left-hand-side root)
  lhs - the value on the left-hand-side of the comparison (undefined if kind === 'N')
  rhs - the value on the right-hand-side of the comparison (undefined if kind === 'D')
  index - when kind === 'A', indicates the array index where the change occurred
  item - when kind === 'A', contains a nested change record indicating the change that occurred at the array index
 */
export const migrate = async (): Promise<void> => {
  const changes: Changes = loadYaml(`${rootDir}/values-changes.yaml`)?.changes
  const prevValues = await hfValues({ filesOnly: true })
  const filteredChanges = filterChanges(prevValues?.version, changes)
  const cloneValues = cloneDeep(prevValues)
  const processedValues = await applyChanges(cloneValues as Record<string, any>, filteredChanges)

  if (!isEqual(prevValues, processedValues)) {
    const argv: Arguments = getParsedArgs()
    debug[argv.dryRun ? 'log' : 'info'](`Full migration: ${JSON.stringify(diff(prevValues, processedValues), null, 2)}`)
    if (!argv.dryRun) await writeValues(processedValues)
  } else debug.info('No changes detected, skipping')

  const schema = loadYaml(`${rootDir}/values-schema.yaml`)?.version
  Object.assign(processedValues, { version: schema.version })
}

export const module = {
  command: cmdName,
  hidden: true,
  describe: 'Migrate values',
  builder: (parser: Argv): Argv =>
    parser.options({
      'dry-run': {
        alias: ['d'],
        boolean: true,
        default: false,
        hidden: true,
      },
    }),

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await migrate()
  },
}
