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
import { BasicArguments, setParsedArgs } from '../common/yargs'
import { askYesNo } from '../common/zx-enhance'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

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

export const moveGivenJsonPath = (yaml: Record<string, unknown>, lhs: string, rhs: string): void => {
  const moveValue = get(yaml, lhs, 'err!')
  if (unset(yaml, lhs)) set(yaml, rhs, moveValue)
}

export function filterChanges(version: number, changes: Changes): Changes {
  return changes.filter((c) => c.version - version > 0)
}

export const applyChanges = async (values: Record<string, unknown> | undefined, changes: Changes): Promise<void> => {
  if (!values) return
  for (const c of changes) {
    c.deletions?.forEach((del) => unset(values, del))
    c.locations?.forEach((loc) => moveGivenJsonPath(values, Object.keys(loc)[0], Object.values(loc)[0]))

    if (c.mutations)
      for (const mut of c.mutations) {
        const path = Object.keys(mut)[0]
        const tmpl = `{{ ${Object.values(mut)[0]} .prev }}`
        const prev = get(values, path)
        const ret = await gucci(tmpl, { prev })
        set(values, path, ret)
      }
    Object.assign(values, { version: c.version })
  }
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
  const processedValues = cloneDeep(prevValues)
  await applyChanges(processedValues, filteredChanges)

  if (!isEqual(prevValues, processedValues)) {
    debug.info(`${JSON.stringify(diff(prevValues, processedValues), null, 2)}`)
    const ack = await askYesNo('Acknowledge migration?', { defaultYes: true })
    if (ack) {
      await writeValues(processedValues as Record<string, any>)
      const schema = loadYaml(`${rootDir}/values-schema.yaml`)?.version
      Object.assign(processedValues, { version: schema.version })
    }
  } else debug.info('No changes detected, skipping')
}

export const module = {
  command: cmdName,
  hidden: true,
  describe: 'Migrate values',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await migrate()
  },
}
