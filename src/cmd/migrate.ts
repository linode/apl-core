import { compare, SemVer } from 'semver'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, loadYaml, OtomiDebugger, rootDir, setParsedArgs, terminal } from '../common/utils'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

interface Change {
  version: SemVer
  locations: {
    [oldLocation: string]: string
  }
  deletions: string[]
  mutations: {
    [preMutation: string]: string[]
  }
}

type Changes = Array<Change>

const migrate = async (): Promise<void> => {
  const changes: Changes = loadYaml(`${rootDir}/values-schema.yaml`)?.changes
  changes.sort((a, b) => compare(a.version, b.version))
}

export const module = {
  command: `${cmdName} [opts...]`,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await migrate()
  },
}
