/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { diff } from 'deep-diff'
import { copy, createFileSync, move, pathExists, renameSync, rm } from 'fs-extra'
import { cloneDeep, each, get, set, unset } from 'lodash'
import { Argv } from 'yargs'
import { cd } from 'zx'
import { commit } from './commit'
import { prepareEnvironment } from '../common/cli'
import { decrypt, encrypt } from '../common/crypt'
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
  relocations?: Array<{
    [oldLocation: string]: string
  }>
  mutations?: Array<{
    [mutation: string]: string
  }>
  renamings?: Array<{
    [oldName: string]: string
  }>
  additions?: Array<{
    [mutation: string]: string
  }>
  fileAdditions?: Array<string>
}

export type Changes = Array<Change>

export const rename = async (
  oldName: string,
  newName: string,
  dryRun = false,
  deps = { pathExists, renameSync, terminal, move, copy, rm },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:rename`)
  if (!(await deps.pathExists(`${env.ENV_DIR}/${oldName}`))) {
    d.warn(`File does not exist: "${env.ENV_DIR}/${oldName}". Already renamed?`)
    return
  }
  // so the file exists, check if it has a '/secrets.' companion
  let secretsCompanionOld
  let secretsCompanionNew
  if (oldName.includes('.yaml') && !oldName.includes('secrets.')) {
    const lastSlashPosOld = oldName.lastIndexOf('/') + 1
    const tmpOld = `${oldName.substring(0, lastSlashPosOld)}secrets.${oldName.substring(lastSlashPosOld)}`
    if (await deps.pathExists(`${env.ENV_DIR}/${secretsCompanionOld}`)) {
      secretsCompanionOld = tmpOld
      const lastSlashPosNew = oldName.lastIndexOf('/') + 1
      secretsCompanionNew = `${newName.substring(0, lastSlashPosNew)}secrets.${newName.substring(lastSlashPosNew)}`
    }
  }
  d.info(`Renaming ${oldName} to ${newName}`)
  if (!dryRun) {
    try {
      await deps.move(`${env.ENV_DIR}/${oldName}`, `${env.ENV_DIR}/${newName}`)
      if (secretsCompanionOld) {
        // we also rename the secret companion
        await deps.move(`${env.ENV_DIR}/${secretsCompanionOld}`, `${env.ENV_DIR}/${secretsCompanionNew}`)
        if (await deps.pathExists(`${env.ENV_DIR}/${secretsCompanionOld}.dec`))
          // and remove the old decrypted file
          await deps.rm(`${env.ENV_DIR}/${secretsCompanionOld}.dec`)
      }
    } catch (e) {
      if (e.message === 'dest already exists.') {
        // we were given a folder that already exists, which is allowed,
        // so we defer to copying the contents and remove the source
        await deps.copy(`${env.ENV_DIR}/${oldName}`, `${env.ENV_DIR}/${newName}`, { preserveTimestamps: true })
        await deps.rm(`${env.ENV_DIR}/${oldName}`, { recursive: true, force: true })
      }
    }
  }
}

const moveGivenJsonPath = (values: Record<string, any>, lhs: string, rhs: string): void => {
  const val = get(values, lhs)
  if (val !== undefined && set(values, rhs, val)) unset(values, lhs)
}

export function filterChanges(version: number, changes: Changes): Changes {
  return changes.filter((c) => c.version - version > 0)
}

const replace = async (tmplStr: string, prev: any): Promise<string> => {
  if (!tmplStr.includes('.prev')) return tmplStr
  const tmpl = `{{ ${tmplStr} }}`
  return (await gucci(tmpl, { prev })) as string
}

/**
 * Allows to mutate or set values in dynamic paths that can include team marker or array notation.
 * Example:
 * - teamConfig.{team}.services[].someProp: replaceMe
 * This would update someProp for all team services
 */
export const setDeep = async (obj: Record<string, any>, path: string, tmplStr: string): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:setDeep`)
  d.debug(`(obj, ${path}, ${tmplStr}`)
  const teamMarker = '{team}'
  const arrayMarker = '[].'

  if (!path.includes(teamMarker) && !path.includes(arrayMarker)) {
    return
  }

  let paths: string[] = [path]
  // expand if we have a team marker
  if (path.includes(teamMarker)) {
    paths = Object.keys(obj.teamConfig || {}).map((t) => path.replace(teamMarker, t))
  }

  // expand on array markers
  await Promise.all(
    paths.map(async (p) => {
      if (!p.includes(arrayMarker)) {
        const prev = get(obj, p)
        const ret = await replace(tmplStr, prev)
        set(obj, p, ret)
        return
      }

      const [lhs, ...rhs] = p.split(arrayMarker)
      const holder = get(obj, lhs)
      if (!holder) return
      await Promise.all(
        holder.map(async (item, idx) => {
          if (rhs.length === 1) {
            const prev = get(item, rhs[0])
            const ret = await replace(tmplStr, prev)
            const realPath = `${lhs}[${idx}].${rhs[0]}`
            set(obj, realPath, ret)
            return
          }
          const rhsPath = rhs.join(arrayMarker)
          // recurse
          const realPath = `${lhs}[${idx}].${rhsPath}`
          await setDeep(obj, realPath, tmplStr)
        }),
      )
    }),
  )
}

/**
 * Applies changes from configuration.
 *
 * NOTE: renamings,deletions,relocations and mutations MUST be given in arrays only,
 * with max 1 item per array, to preserve order of operation
 */
export const applyChanges = async (
  changes: Changes,
  dryRun = false,
  deps = {
    cd,
    rename,
    hfValues,
    terminal,
    writeValues,
  },
): Promise<Record<string, any>> => {
  deps.cd(env.ENV_DIR)
  // do file renamings first as those have to match the current containers expectations
  for (const c of changes) {
    c.renamings?.forEach((entry) => each(entry, async (newName, oldName) => deps.rename(oldName, newName, dryRun)))
    // same for any new file additions
    c.fileAdditions?.forEach((path) => createFileSync(`${env.ENV_DIR}/${path}`))
  }
  // only then can we get the values and do mutations on them
  const prevValues = (await deps.hfValues({ filesOnly: true })) as Record<string, any>
  const values = cloneDeep(prevValues)
  for (const c of changes) {
    c.deletions?.forEach((entry) => unset(values, entry) && unset(values, entry))
    c.additions?.forEach((entry) => each(entry, (val, path) => set(values, path, val)))
    c.relocations?.forEach((entry) => each(entry, (newName, oldName) => moveGivenJsonPath(values, oldName, newName)))
    if (c.mutations)
      // 'for const of' is used here to allow await in loop
      for (const mut of c.mutations) {
        const [path, tmplStr] = Object.entries(mut)[0]
        const prev = get(values, path)
        if (prev !== undefined) {
          // path worked and we found something, simple scenario, just replace directly
          const ret = await replace(tmplStr, prev)
          set(values, path, ret)
        } else {
          // we might have a complex path, which we will deal with in setDeep
          await setDeep(values, path, tmplStr)
        }
      }

    Object.assign(values, { version: c.version })
  }
  if (!dryRun) await deps.writeValues(values, true)
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
export const migrate = async (): Promise<boolean> => {
  const d = terminal(`cmd:${cmdName}:migrate`)
  const argv: Arguments = getParsedArgs()
  const changes: Changes = loadYaml(`${rootDir}/values-changes.yaml`)?.changes
  const prevVersion: number = loadYaml(`${env.ENV_DIR}/env/settings.yaml`)?.version || 0
  const filteredChanges = filterChanges(prevVersion, changes)
  if (filteredChanges.length) {
    d.log('Changes detected, migrating...')
    const diffedValues = await applyChanges(filteredChanges, argv.dryRun)
    // encrypt and decrypt to
    await encrypt()
    await decrypt()
    d.log(`Migration changes: ${JSON.stringify(diffedValues, null, 2)}`)
    return true
  }
  d.log('No changes detected, skipping')
  return false
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
    const res = await migrate()
    if (env.CI && res) {
      setParsedArgs({ ...argv, message: 'migrated values [ci skip]' })
      await commit()
    }
  },
}
