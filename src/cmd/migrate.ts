import { diff } from 'deep-diff'
import { cloneDeep, get, set, unset } from 'lodash'
import { compare, valid } from 'semver'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { OtomiDebugger, terminal } from '../common/debug'
import { hfValues } from '../common/hf'
import { getFilename, loadYaml, rootDir } from '../common/utils'
import { writeValues } from '../common/values'
import { BasicArguments, setParsedArgs } from '../common/yargs'
import { askYesNo } from '../common/zx-enhance'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

interface Change {
  version: string
  deletions?: Array<string>
  locations?: Array<{
    [oldLocation: string]: string
  }>
  mutations?: Array<{
    [preMutation: string]: string[]
  }>
}

export type Changes = Array<Change>

export const deleteGivenJsonPath = (
  yaml: Record<string, unknown> | undefined,
  jsonpath: string,
): Record<string, any> | undefined => {
  if (unset(yaml, jsonpath)) return yaml
  return undefined
}

export const moveGivenJsonPath = (
  yaml: Record<string, unknown> | undefined,
  jsonpath: string,
  rhs: string,
): Record<string, any> | undefined => {
  const moveValue = get(yaml, jsonpath, 'err!')
  if (unset(yaml, jsonpath) && yaml && set(yaml, rhs, moveValue)) return yaml
  return undefined
}

export const mutateGivenJsonPath = (
  yaml: Record<string, unknown> | undefined,
  jsonpath: string,
  rhs: string[],
): Record<string, any> | undefined => {
  if (Array.isArray(rhs) && yaml) {
    const prevValue = get(yaml, jsonpath)
    if (typeof prevValue === 'string') set(yaml, jsonpath, prevValue.replace(new RegExp(rhs[0]), rhs[1]))
    return yaml
  }
  return undefined
}

export function filterChanges(currentVersion: string, changes: Changes): Changes {
  if (!valid(currentVersion))
    throw new Error(`Please set otomi.version to a valid SemVer, e.g. 1.2.3 (received ${currentVersion})`)
  return changes.filter((c) => compare(c.version, currentVersion) >= 1).sort((a, b) => compare(a.version, b.version))
}

export const migrate = (
  values: Record<string, unknown> | undefined,
  changes: Changes,
): Record<string, unknown> | undefined => {
  const returnValues = cloneDeep(values)
  if (changes)
    changes.forEach((change) => {
      change.deletions?.map((del) => deleteGivenJsonPath(returnValues, del))
      change.locations?.map((loc) => moveGivenJsonPath(returnValues, Object.keys(loc)[0], Object.values(loc)[0]))
      change.mutations?.map((mut) => mutateGivenJsonPath(returnValues, Object.keys(mut)[0], Object.values(mut)[0]))
    })

  return returnValues
}

// Differences are reported as one or more change records. Change records have the following structure:

// kind - indicates the kind of change; will be one of the following:
// N - indicates a newly added property/element
// D - indicates a property/element was deleted
// E - indicates a property/element was edited
// A - indicates a change occurred within an array
// path - the property path (from the left-hand-side root)
// lhs - the value on the left-hand-side of the comparison (undefined if kind === 'N')
// rhs - the value on the right-hand-side of the comparison (undefined if kind === 'D')
// index - when kind === 'A', indicates the array index where the change occurred
// item - when kind === 'A', contains a nested change record indicating the change that occurred at the array index
export const module = {
  command: cmdName,
  hidden: true,
  describe: 'Migrate values',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await validateValues()

    const prevValues = await hfValues({ filesOnly: true })
    const currentVersion = prevValues?.otomi?.version
    const readChanges: Changes = loadYaml(`${rootDir}/values-changes.yaml`)?.changes
    const changes = filterChanges(currentVersion, readChanges)
    const processedValues = migrate(prevValues, changes)
    debug.info(`${JSON.stringify(diff(prevValues, processedValues), null, 2)}`)
    if ((await askYesNo(`Acknowledge migration:`)) && processedValues) {
      await writeValues(processedValues)
      await validateValues()
    }
  },
}
