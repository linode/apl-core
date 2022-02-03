/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { diff } from 'deep-diff'
import { existsSync } from 'fs'
import { renameSync } from 'fs-extra'
import { cloneDeep, each, get, set, unset } from 'lodash'
import { Argv } from 'yargs'
import { cd } from 'zx'
import { prepareEnvironment } from '../common/cli'
import { terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getFilename, gucci, loadYaml, rootDir } from '../common/utils'
import { writeValues } from '../common/values'
import { BasicArguments, getParsedArgs, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)

interface Arguments extends BasicArguments {
  dryRun?: boolean
}

interface Change {
  version: number
  deletions?: Array<string>
  locations?: Record<string, string>
  mutations?: Array<{
    [preMutation: string]: string
  }>
  renamings?: Record<string, string>
}

export type Changes = Array<Change>

export const rename = (
  oldName: string,
  newName: string,
  dryRun = false,
  deps = { existsSync, renameSync, terminal },
): void => {
  const d = deps.terminal(`cmd:${cmdName}:rename`)
  if (!deps.existsSync(`${env.ENV_DIR}/${oldName}`)) {
    d.warn(`File does not exist: ${env.ENV_DIR}/${oldName}. Already renamed?`)
    return
  }
  d.info(`Renaming ${oldName} to ${newName}`)
  if (!dryRun) deps.renameSync(`${env.ENV_DIR}/${oldName}`, `${env.ENV_DIR}/${newName}`)
}

export const moveGivenJsonPath = (values: Record<string, any>, lhs: string, rhs: string): void => {
  const moveValue = get(values, lhs, 'err!')
  if (unset(values, lhs)) set(values, rhs, moveValue)
}

export function filterChanges(version: number, changes: Changes): Changes {
  return changes.filter((c) => c.version - version > 0)
}

export const applyChanges = async (
  changes: Changes,
  dryRun = false,
  deps = {
    existsSync,
    hfValues,
    renameSync,
    terminal,
    writeValues,
  },
): Promise<Record<string, any>> => {
  cd(env.ENV_DIR)
  // do file renamings first as those have to match the current containers expectations
  for (const c of changes) {
    each(c.renamings, (newName, oldName) => rename(oldName, newName, dryRun, deps))
  }
  // only then can we get the values and do mutations on them
  const prevValues = (await deps.hfValues({ filesOnly: true })) as Record<string, any>
  const values = cloneDeep(prevValues)
  for (const c of changes) {
    c.deletions?.forEach((del) => unset(values, del))
    each(c.locations, (newName, oldName) => moveGivenJsonPath(values, oldName, newName))

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
  if (!dryRun) await deps.writeValues(values)
  // @ts-ignore
  return diff(prevValues, values)
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
  const d = terminal(`cmd:${cmdName}:migrate`)
  const argv: Arguments = getParsedArgs()
  const changes: Changes = loadYaml(`${rootDir}/values-changes.yaml`)?.changes
  const prevVersion: number = loadYaml(`${env.ENV_DIR}/env/settings.yaml`)?.version
  const filteredChanges = filterChanges(prevVersion, changes)
  if (filteredChanges.length) {
    const diffedValues = await applyChanges(filteredChanges, argv.dryRun)
    d[argv.dryRun ? 'log' : 'info'](`Migration changes: ${JSON.stringify(diffedValues, null, 2)}`)
  } else d.info('No changes detected, skipping')
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
