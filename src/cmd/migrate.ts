/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { randomUUID } from 'crypto'
import { diff } from 'deep-diff'
import { copy, createFileSync, move, pathExists, renameSync, rm } from 'fs-extra'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { cloneDeep, each, get, isObject, mapKeys, mapValues, omit, pick, pull, set, unset } from 'lodash'
import { basename, dirname, join } from 'path'
import { prepareEnvironment } from 'src/common/cli'
import { decrypt, encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { hf, hfValues } from 'src/common/hf'
import { getFileMap, getTeamNames, saveValues } from 'src/common/repo'
import { getFilename, getSchemaSecretsPaths, gucci, loadYaml, rootDir } from 'src/common/utils'
import { writeValues, writeValuesToFile } from 'src/common/values'
import { BasicArguments, getParsedArgs, setParsedArgs } from 'src/common/yargs'
import { v4 as uuidv4 } from 'uuid'
import { parse } from 'yaml'
import { Argv } from 'yargs'
import { $, cd } from 'zx'
const cmdName = getFilename(__filename)

interface Arguments extends BasicArguments {
  dryRun?: boolean
}

interface Change {
  version: number
  clones?: Array<{
    [targetPath: string]: string
  }>
  fileDeletions?: Array<string>
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
  bulkAdditions?: Array<{
    [mutation: string]: string
  }>
  networkPoliciesMigration?: boolean
}

export type Changes = Array<Change>

export const deleteFile = async (
  relativeFilePath: string,
  dryRun = false,
  deps = { pathExists, renameSync, terminal, copy, rm },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:rename`)
  const path = `${env.ENV_DIR}/${relativeFilePath}`
  if (!(await deps.pathExists(path))) {
    d.warn(`File does not exist: "${path}". Already removed?`)
    return
  }
  if (!dryRun) {
    await deps.rm(path)
  }
}

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
  const lhsPaths = unparsePaths(lhs, values)
  const rhsPaths = unparsePaths(rhs, values)

  lhsPaths.forEach((lhsPath, index) => {
    const pathParts = lhsPath.split('.')
    const item = pathParts.pop()
    const path = pathParts.join('.')
    const prev = get(values, path)
    const val = get(values, lhsPath)

    if (!val && Array.isArray(prev) && prev.includes(item)) {
      set(values, lhsPath, pull(prev, item))
      const next = get(values, rhsPaths[index])
      if (next && !next.includes(item)) {
        next.push(item)
        set(values, rhsPaths[index], next)
      } else {
        set(values, rhsPaths[index], [item])
      }
      return
    }

    if (val && set(values, rhsPaths[index], val)) {
      unset(values, lhsPath)
    }
  })
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
    paths = Object.keys((obj.teamConfig as Record<string, any>) || {}).map((t) => path.replace(teamMarker, t))
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

const transformIngressPolicy = (service: any, networkPolicy: any, netpols: any[]) => {
  if (!networkPolicy.ingressPrivate) return
  const ingress = {
    ...networkPolicy.ingressPrivate,
    toLabelName: 'otomi.io/app',
    toLabelValue: service.name,
  }
  if (ingress?.allow?.length > 0) {
    ingress.allow = ingress.allow.map((a: any) => transformAllow(a))
  }
  netpols.push({
    id: uuidv4(),
    ...(service.name && { name: service.name }),
    ruleType: {
      type: 'ingress',
      ingress,
    },
  })
}

const transformAllow = (a: any) => {
  const allow = { ...a }
  if (allow.team) {
    allow.fromNamespace = `team-${allow.team}`
    unset(allow, 'team')
  }
  if (allow.service) {
    allow.fromLabelName = 'otomi.io/app'
    allow.fromLabelValue = allow.service
    unset(allow, 'service')
  }
  return allow
}

const transformEgressPolicy = (service: any, netpols: any[]) => {
  if (!service.networkPolicy.egressPublic) return
  const egress = [...service.networkPolicy.egressPublic]
  egress.forEach((e: any) => {
    netpols.push({
      id: uuidv4(),
      ...(e.domain && { name: e.domain.replaceAll('.', '-').replaceAll(':', '-') }),
      ruleType: {
        type: 'egress',
        egress: e,
      },
    })
  })
}

const networkPoliciesMigration = async (values: Record<string, any>): Promise<void> => {
  const teams: Array<string> = Object.keys(values?.teamConfig as Record<string, any>)
  await Promise.all(
    teams.map(async (teamName) => {
      const servicePermissions = get(values, `teamConfig.${teamName}.selfService.service`, [])
      if (servicePermissions.includes('networkPolicy'))
        set(
          values,
          `teamConfig.${teamName}.selfService.service`,
          servicePermissions.filter((s: any) => s !== 'networkPolicy'),
        )

      createFileSync(`${env.ENV_DIR}/env/teams/netpols.${teamName}.yaml`)
      let services = get(values, `teamConfig.${teamName}.services`)
      if (!services || services.length === 0) return
      const valuesToWrite = {
        teamConfig: {},
      }
      const netpols: any = []

      services
        .filter((s) => s?.networkPolicy && s?.networkPolicy?.ingressPrivate?.mode !== 'DenyAll')
        .forEach((service: any) => {
          const { networkPolicy } = service
          transformIngressPolicy(service, networkPolicy, netpols)
          transformEgressPolicy(service, netpols)
        })

      valuesToWrite.teamConfig[teamName] = { netpols }
      await writeValuesToFile(`${env.ENV_DIR}/env/teams/netpols.${teamName}.yaml`, valuesToWrite, true)
      set(values, `teamConfig.${teamName}.netpols`, netpols)
      services = services.map((service: any) => {
        if (service.networkPolicy) {
          unset(service, 'networkPolicy')
        }
        return service
      })
      set(values, `teamConfig.${teamName}.services`, services)
    }),
  )
}

const bulkAddition = (path: string, values: any, filePath: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const val = require(filePath)
  setAtPath(path, values, val)
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
    c.deletions?.forEach((entry) => unsetAtPath(entry, values))
    c.additions?.forEach((entry: any) => each(entry, (val, path) => setAtPath(path, values, val)))
    c.bulkAdditions?.forEach((entry) => each(entry, (filePath, path) => bulkAddition(path, values, filePath)))
    c.relocations?.forEach((entry) => each(entry, (newName, oldName) => moveGivenJsonPath(values, oldName, newName)))
    if (c.mutations)
      // 'for const of' is used here to allow await in loop
      for (const mut of c.mutations) {
        // eslint-disable-next-line prefer-destructuring
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
    // Lastly we remove files
    for (const change of changes) {
      change.fileDeletions?.forEach((entry) => {
        const paths = unparsePaths(entry, values)
        paths.forEach((path) => deleteFile(path))
      })
    }

    if (c.networkPoliciesMigration) await networkPoliciesMigration(values)

    Object.assign(values, { version: c.version })
  }
  if (!dryRun) await deps.writeValues(values, true)
  // @ts-ignore
  return diff(prevValues, values)
}

export const unparsePaths = (path: string, values: Record<string, any>): Array<string> => {
  if (path.includes('{team}')) {
    let paths: Array<string> = []
    const teams: Array<string> = Object.keys(values?.teamConfig as Record<string, any>)
    teams.forEach((teamName) => paths.push(path.replace('{team}', teamName)))
    paths = isArray(paths, values)
    return paths.sort()
  } else {
    const paths = isArray([path], values)
    return paths
  }
}

function isArray(paths: string[], values: Record<string, any>): string[] {
  const transformedPaths: string[] = []

  paths.forEach((path) => {
    const match = path.match(/^(.*)\.(\w+)\[\](.*)$/)
    if (!match) {
      transformedPaths.push(path)
      return
    }

    const [, beforeArrayPath, arrayKey, afterArrayPath] = match

    const objectPath = beforeArrayPath.split('.').reduce((obj, key) => obj?.[key], values)

    if (objectPath && objectPath[arrayKey]) {
      objectPath[arrayKey].forEach((_item: any, index: number) => {
        transformedPaths.push(`${beforeArrayPath}.${arrayKey}[${index}]${afterArrayPath}`)
      })
    }
  })

  return transformedPaths
}
export const unsetAtPath = (path: string, values: Record<string, any>): void => {
  const paths = unparsePaths(path, values)
  paths.forEach((p) => unset(values, p))
}

export const setAtPath = (path: string, values: Record<string, any>, value: string): void => {
  const paths = unparsePaths(path, values)
  paths.forEach((p) => set(values, p, Array.isArray(value) ? [...value] : value))
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

interface FileContent {
  path: string
  content: string
}

export async function getStandaloneFilesToMigrate(envDir: string): Promise<Record<string, any>> {
  const files: Record<string, any> = {}
  const pathGlobs = [getFileMap('AplTeamSecret', envDir).pathGlob, `${envDir}/env/teams/workloads/*/*.yaml`]
  const filePaths = await glob(pathGlobs)

  await Promise.allSettled(
    filePaths.map(async (path) => {
      try {
        const relativePath = path.replace(`${envDir}/`, '')
        const fileContent = await readFile(path, 'utf8')
        // Get sealed secret name from the file and use it as the filename
        if (path.includes('sealedsecrets')) {
          const parsedYaml = parse(fileContent)
          const newRelativePath = relativePath.replace(
            /sealedsecrets\/[^/]+\.yaml$/,
            `sealedsecrets/${parsedYaml.metadata.name}.yaml`,
          )
          files[newRelativePath] = fileContent
        } else {
          files[relativePath] = fileContent
        }
      } catch (error) {
        console.error(`Error processing file ${path}:`, error)
      }
    }),
  )
  return files
}

function renameKeyDeep(obj: any, oldKey: string, newKey: string): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => renameKeyDeep(item, oldKey, newKey))
  } else if (isObject(obj)) {
    return mapValues(
      mapKeys(obj, (value, key) => (key === oldKey ? newKey : key)),
      (value) => renameKeyDeep(value, oldKey, newKey),
    )
  }
  return obj
}

export const migrateLegacyValues = async (envDir: string, deps = { writeFile }): Promise<boolean> => {
  const output = await hf(
    { fileOpts: `${rootDir}/helmfile.tpl/helmfile-dump-files-old.yaml`, args: 'build' },
    undefined,
    envDir,
  )
  const jsonValues = parse(output.stdout).renderedvalues
  //TODO remove this renaming of coderepo to codeRepo to adhere camelCase
  const oldValues = renameKeyDeep(jsonValues, 'coderepos', 'codeRepos')

  const files = await getStandaloneFilesToMigrate(envDir)
  const newFiles: FileContent[] = []
  Object.entries(files).forEach(([filePath, fileContent]) => {
    let newFilePath = filePath
    if (filePath.includes('workloads')) {
      const teamName = extractTeamDirectoryFromWorkloadPath(filePath)
      const workloadFileName = basename(filePath)
      newFilePath = join('env', 'teams', teamName, 'workloadValues', workloadFileName)
    }
    newFiles.push({ path: newFilePath, content: fileContent })
  })

  const oldTeams = get(oldValues, 'teamConfig', {})
  Object.keys(oldTeams).forEach((teamName) => {
    const settingsKeys = [
      'alerts',
      'id',
      'limitRange',
      'managedMonitoring',
      'networkPolicy',
      'oidc',
      'resourceQuota',
      'selfService',
      'password',
    ]

    const teamSettings = pick(oldTeams[teamName], settingsKeys)
    const teamResources = omit(oldTeams[teamName], settingsKeys)

    const newTeam = { ...teamResources, settings: teamSettings }
    oldTeams[teamName] = newTeam
  })
  const users = get(oldValues, 'users', [])
  users.forEach((user) => {
    set(user, 'id', user.id || randomUUID())
  })
  oldValues.versions = { specVersion: 1 }
  const teamNames = await getTeamNames(env.ENV_DIR)
  const secretPaths = await getSchemaSecretsPaths(teamNames)
  const valuesPublic = omit(oldValues, secretPaths)
  const valuesSecrets = pick(oldValues, secretPaths)

  // FIXME migrate workloadValues folder and change ApplicationSet !!
  // ensure that all old files are gone
  await $`rm -rf ${env.ENV_DIR}/env`

  //Write standalone files
  await Promise.all(
    newFiles.map(async (f) => {
      const path = `${env.ENV_DIR}/${f.path}`
      await mkdir(dirname(path), { recursive: true })
      await deps.writeFile(path, f.content)
    }),
  )
  await saveValues(env.ENV_DIR, valuesPublic, valuesSecrets)
  await encrypt(env.ENV_DIR)
  return true
}

export const migrate = async (): Promise<boolean> => {
  const d = terminal(`cmd:${cmdName}:migrate`)
  const argv: Arguments = getParsedArgs()
  d.log('Migrating values')
  if (await pathExists(`${env.ENV_DIR}/env/settings.yaml`)) {
    d.log('Detected the old values file structure')
    await migrateLegacyValues(env.ENV_DIR)
  }
  const changes: Changes = (await loadYaml(`${rootDir}/values-changes.yaml`))?.changes
  const versions = await loadYaml(`${env.ENV_DIR}/env/settings/versions.yaml`, { noError: true })
  d.log('VERSIONS PATH: ', `${env.ENV_DIR}/env/settings/versions.yaml`)
  d.log('VERSIONS: ', versions)
  const prevVersion: number = versions?.specVersion
  if (!prevVersion) {
    d.log('No previous version detected')
    d.log('No changes detected, skipping')
    return false
  }
  d.log('PREVIOUS VERSION: ', prevVersion)
  const filteredChanges = filterChanges(prevVersion, changes)
  d.log('FILTEREDCHANGES', filteredChanges)
  if (filteredChanges.length) {
    d.log(
      `Changes detected, migrating from ${prevVersion} to ${
        filteredChanges[filteredChanges.length - 1].version
      } version`,
    )
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

export function extractTeamDirectoryFromWorkloadPath(filePath: string): string {
  const match = filePath.match(/\/workloads\/([^/]+)/)
  if (match === null) throw new Error(`Cannot extract team name from ${filePath} string`)
  return match[1]
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
