import { get, set, unset } from 'lodash'
import { compare, SemVer } from 'semver'
import { Argv } from 'yargs'
import { hfValues } from '../common/hf'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, loadYaml, OtomiDebugger, rootDir, setParsedArgs, terminal } from '../common/utils'
import { writeValues } from '../common/values'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

interface Change {
  version: SemVer
  deletions?: string[]
  locations?: Array<{
    [oldLocation: string]: string
  }>
  mutations?: {
    [preMutation: string]: string[]
  }
}

type Changes = Array<Change>

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

const migrate = async () => {
  // const currentVersion: string | undefined = `${loadYaml(`${env.ENV_DIR}/env/settings.yaml`)?.otomi?.version}`
  // if (!valid(currentVersion))
  //   throw new Error(`Please set otomi.version to a valid SemVer, e.g. 1.2.3 (received ${currentVersion})`)

  let values = await hfValues({ filesOnly: true })
  loadYaml(`${rootDir}/values-changes.yaml`)
    ?.changes.sort((a, b) => compare(a.version, b.version))
    .forEach((change) => {
      change.deletions?.forEach((del) => {
        values = { values, ...deleteGivenJsonPath(values, del) }
      })
      // change.locations?.forEach((loc) => {
      //   moveGivenJsonPath(values, Object.keys(loc)[0], loc)
      // })
      // change.mutations?.forEach((del) => {
      //   deleteGivenJsonPath(values, del)
      // })
    })
  if (typeof values === 'object') await writeValues(values)
}

export const module = {
  command: `${cmdName} [opts...]`,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await validateValues()
    await migrate()
  },
}
