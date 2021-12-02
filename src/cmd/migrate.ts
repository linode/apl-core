import { get, set, unset } from 'lodash'
import { compare, SemVer, valid } from 'semver'
import { Argv } from 'yargs'
import { env } from '../common/envalid'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, loadYaml, OtomiDebugger, rootDir, setParsedArgs, terminal } from '../common/utils'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

interface Change {
  version: SemVer
  deletions?: string[]
  locations?: {
    [oldLocation: string]: string
  }
  mutations?: {
    [preMutation: string]: string[]
  }
}

type Changes = Array<Change>

export const deleteGivenJsonPath = (file: string, key: string): Record<string, any> | undefined => {
  const yaml = loadYaml(file)
  if (unset(yaml, key)) return yaml
  return undefined
}

export const moveGivenJsonPath = (file: string, key: string, val: string): Record<string, any> | undefined => {
  const yaml = loadYaml(file)
  const moveValue = get(yaml, key, 'err!')
  if (unset(yaml, key) && yaml && set(yaml, val, moveValue)) return yaml
  return undefined
}

export const mutateGivenJsonPath = (file: string, key: string, val: string[]): Record<string, any> | undefined => {
  const yaml = loadYaml(file)
  if (Array.isArray(val) && yaml && set(yaml, key, get(yaml, key).replace(...val))) return yaml
  return undefined
}

const migrate = () => {
  const changes: Changes = loadYaml(`${rootDir}/values-schema.yaml`)?.changes
  changes.sort((a, b) => compare(a.version, b.version))
  const currentVersion: string = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)?.cluster?.version
  if (!valid(currentVersion)) throw new Error('Please set cluster.version to a valid SemVer, e.g. 1.2.3')

  while (changes.length) {
    const curr = changes.pop()
    if (curr && compare(currentVersion, curr?.version)) {
      debug.info(`${currentVersion}>=${curr?.version}`)
    }
  }
}

export const module = {
  command: `${cmdName} [opts...]`,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    await validateValues()
    migrate()
  },
}
