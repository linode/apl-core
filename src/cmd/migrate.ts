import { cloneDeep, get, set, unset } from 'lodash'
import { compare, valid } from 'semver'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { OtomiDebugger, terminal } from '../common/debug'
import { env } from '../common/envalid'
import { hfValues } from '../common/hf'
import { getFilename, loadYaml, rootDir } from '../common/utils'
import { writeValues } from '../common/values'
import { BasicArguments, setParsedArgs } from '../common/yargs'
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
  let returnValues = cloneDeep(values)
  if (changes)
    changes.forEach((change) => {
      change.deletions?.forEach((del) => {
        returnValues = { returnValues, ...deleteGivenJsonPath(returnValues, del) }
      })
    })

  return returnValues
}

export const module = {
  command: cmdName,
  hidden: true,
  describe: 'Migrate values',
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await validateValues()

    const currentVersion = loadYaml(`${env().ENV_DIR}/env/settings.yaml`)?.otomi?.version
    const readChanges = loadYaml(`${rootDir}/values-changes.yaml`)?.changes
    const changes = filterChanges(currentVersion, readChanges)
    const processedValues = migrate(await hfValues({ filesOnly: true }), changes)
    if (processedValues) await writeValues(processedValues)
  },
}
