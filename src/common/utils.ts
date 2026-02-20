import $RefParser, { JSONSchema } from '@apidevtools/json-schema-ref-parser'
import cleanDeep, { CleanOptions } from 'clean-deep'
import { createHash } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { readdir, readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import walk from 'ignore-walk'
import { dump, load } from 'js-yaml'
import { omit } from 'lodash'
import { dirname, join, resolve } from 'path'
import { $, ProcessOutput, within } from 'zx'
import { terminal } from './debug'
import { env } from './envalid'

const packagePath = process.cwd()

// we keep the rootDir for zx, but have to fix it for drone, which starts in /home/app/stack/env (to accommodate write perms):
export const rootDir = process.cwd() === '/home/app/stack/env' ? '/home/app/stack' : process.cwd()
export const pkg = JSON.parse(readFileSync(`${rootDir}/package.json`, 'utf8'))
export const getFilename = (path: string): string => path.split('/').pop()?.split('.')[0] as string

export const asArray = (args: string | string[]): string[] => {
  return Array.isArray(args) ? args : [args]
}

export const removeBlankAttributes = (obj: Record<string, any>): Record<string, any> => {
  const options: CleanOptions = {
    emptyArrays: true,
    emptyObjects: true,
    emptyStrings: true,
    nullValues: false,
    undefinedValues: true,
  }
  return cleanDeep(obj, options)
}

export const readdirRecurse = async (dir: string, opts?: { skipHidden: boolean }): Promise<string[]> => {
  const dirs = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    dirs.map(async (dirOrFile) => {
      const res = resolve(dir, dirOrFile.name)
      if (opts?.skipHidden && dirOrFile.name.startsWith('.')) return []
      return dirOrFile.isDirectory() ? readdirRecurse(res) : res
    }),
  )
  return files.flat()
}

export const getDirNames = async (dir: string, opts?: { skipHidden: boolean }): Promise<string[]> => {
  const dirs = await readdir(dir, { withFileTypes: true })
  const dirNames: Array<string> = []
  dirs.map((dirOrFile) => {
    if (opts?.skipHidden && dirOrFile.name.startsWith('.')) return
    if (dirOrFile.isDirectory()) dirNames.push(dirOrFile.name)
  })
  return dirNames
}

export const enum FileType {
  Directory = 'directory',
  File = 'file',
}

export const getEnvFiles = (): Promise<string[]> => {
  return walk({
    path: env.ENV_DIR,
    ignoreFiles: ['.gitignore'],
    follow: true,
  })
}

export const loadYaml = async (
  path: string,
  opts?: { noError: boolean },
): Promise<Promise<Record<string, any> | undefined>> => {
  if (!existsSync(path)) {
    if (opts?.noError) return undefined
    throw new Error(`${path} does not exist`)
  }
  const file = await readFile(path, 'utf-8')
  return load(file) as Record<string, any>
}

export const flattenObject = (obj: Record<string, any>, path = ''): { [key: string]: string } => {
  return Object.entries(obj)
    .flatMap(([key, value]) => {
      const subPath = path.length ? `${path}.${key}` : key
      if (typeof value === 'object' && !Array.isArray(value) && value !== null)
        return flattenObject(value as Record<string, any>, subPath)
      return { [subPath]: value }
    })
    .reduce((acc, base) => {
      return { ...acc, ...base }
    }, {})
}
export interface GucciOptions {
  asObject?: boolean
}

export const gucci = async (
  tmpl: string | unknown,
  ctx: { [key: string]: any },
  asString = false,
): Promise<string | unknown> => {
  const kv = flattenObject(ctx)
  const gucciArgs = Object.entries(kv).map(([k, v]) => {
    // Cannot template if key contains regex characters, so skip
    if (stringContainsSome(k, ...'^()[]$'.split(''))) return ''
    const val = typeof v === 'object' ? JSON.stringify(v) : v
    const escaped = String(val ?? '').replaceAll("'", "'\\''")
    return `-s ${k}='${escaped}'`
  })

  return within(async () => {
    $.quote = (v) => v
    let processOutput: ProcessOutput
    const templateContent: string = typeof tmpl === 'string' ? tmpl : dump(tmpl, { lineWidth: -1 })
    // Cannot be a path if it wasn't a string
    if (typeof tmpl === 'string' && existsSync(templateContent)) {
      processOutput = await $`gucci -o missingkey=zero ${gucciArgs} ${templateContent}`
    } else {
      // input string is a go template content
      processOutput = await $`echo "${templateContent.replaceAll('"', '\\"')}" | gucci -o missingkey=zero ${gucciArgs}`
    }
    const ret = processOutput.stdout.trim()
    if (asString) {
      return ret
    }
    // translate the output from yaml to js, and return it, whatever shape
    return load(ret)
  })
}

export const extract = (
  schema: Record<string, any>,
  leaf: string,
  mapValue = (val: any) => val,
): Record<string, any> => {
  const schemaKeywords = ['properties', 'anyOf', 'allOf', 'oneOf', 'default', 'x-secret', 'x-acl']
  return Object.keys(schema)
    .map((key) => {
      const childObj: JSONSchema = schema[key]
      if (key === leaf) return schemaKeywords.includes(key) ? mapValue(childObj) : { [key]: mapValue(childObj) }
      if (typeof childObj !== 'object') return {}
      const obj: JSONSchema = extract(childObj, leaf, mapValue)
      if ('extractedValue' in obj) return { [key]: obj.extractedValue }
      const specialCondition = schemaKeywords.includes(key) || !Object.keys(obj).length || !Number.isNaN(Number(key))
      if (specialCondition) {
        // @ts-ignore
        return obj === '{}' ? undefined : obj
      }
      return { [key]: obj }
    })
    .reduce((accumulator, extractedValue) => {
      return typeof extractedValue !== 'object'
        ? { ...accumulator, extractedValue }
        : { ...accumulator, ...extractedValue }
    }, {})
}

let valuesSchema: Record<string, any>
export const getValuesSchema = async (): Promise<Record<string, any>> => {
  if (valuesSchema) return valuesSchema
  const schema = await loadYaml(`${rootDir}/values-schema.yaml`)
  const derefSchema = await $RefParser.dereference(schema as JSONSchema)
  valuesSchema = omit(derefSchema, ['definitions'])

  return valuesSchema
}

export const stringContainsSome = (str: string, ...args: string[]): boolean => {
  if (!str) return false
  return args.some((arg) => str.includes(arg))
}

const isCoreCheck = (): boolean => {
  if (packagePath === '/home/app/stack' || !existsSync(`${packagePath}/package.json`)) return false
  return pkg.name === 'apl-core'
}

export const isCore: boolean = isCoreCheck()

export const getSchemaSecretsPaths = async (teams: string[]): Promise<string[]> => {
  const schema: any = await getValuesSchema()
  const leaf = 'x-secret'
  const schemaSecrets: JSONSchema = extract(schema as JSONSchema, leaf, (val: any) =>
    val.length > 0 ? `{{ ${val} }}` : val,
  )
  // Get all JSON paths for secrets, without the .x-secret appended
  const secretPaths = Object.keys(flattenObject(schemaSecrets)).map((v) => v.replaceAll(`.${leaf}`, ''))
  // now blow up the teamConfig.$team prop as it is determined by a pattern
  const cleanSecretPaths: string[] = []
  const teamProp = `teamConfig.patternProperties.${
    Object.keys(schema.properties.teamConfig.patternProperties as JSONSchema)[0]
  }`
  secretPaths.forEach((p) => {
    teams.forEach((team: string) => {
      if (p.indexOf(teamProp) === 0) cleanSecretPaths.push(p.replace(teamProp, `teamConfig.${team}`))
    })
    if (p.indexOf(teamProp) === -1 && !cleanSecretPaths.includes(p)) cleanSecretPaths.push(p)
  })

  cleanSecretPaths.push('users')
  return cleanSecretPaths
}

async function ensureKeepFile(keepFilePath: string, deps = { writeFile }): Promise<void> {
  const dirPath = dirname(keepFilePath)
  if (!existsSync(dirPath)) {
    await $`mkdir -p ${dirname(keepFilePath)}`
  }
  if (existsSync(keepFilePath)) return
  // create the .keep file
  await deps.writeFile(keepFilePath, '')
}

export async function ensureTeamGitOpsDirectories(
  envDir: string,
  values: Record<string, any>,
  deps = { writeFile, glob },
) {
  const dirs = await deps.glob(`${envDir}/env/teams/*`)
  const baseGitOpsDirs = ['sealedsecrets', 'workloadValues']
  const aiGitOpsDirs = ['databases', 'knowledgebases', 'agents']

  const aiEnabled = values?.otomi?.aiEnabled ?? false
  const gitOpsDirs = aiEnabled ? [...baseGitOpsDirs, ...aiGitOpsDirs] : baseGitOpsDirs

  const keepFilePaths: string[] = []
  for (const teamDir of dirs) {
    for (const gitOpsDir of gitOpsDirs) {
      keepFilePaths.push(join(teamDir, gitOpsDir, '.gitkeep'))
    }
  }

  await Promise.allSettled(
    keepFilePaths.map(async (keepFilePath) => {
      await ensureKeepFile(keepFilePath, deps)
      if (!existsSync(dirname(keepFilePath))) {
        await $`mkdir -p ${dirname(keepFilePath)}`
      }
    }),
  )
  return keepFilePaths
}

function hashContent(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex')
}

export async function hasFileDifference(filePathOne: string, filePathTwo: string): Promise<boolean> {
  const d = terminal(`common:utils:hasFileDifference`)
  try {
    const fileOneContent = await readFile(filePathOne)
    const fileTwoContent = await readFile(filePathTwo)

    const fileOneHash = hashContent(fileOneContent)
    const fileTwoHash = hashContent(fileTwoContent)

    return fileOneHash !== fileTwoHash
  } catch (err) {
    d.error(`Error reading files: ${err}`)
    return true // If there's an error, assume files are different
  }
}
