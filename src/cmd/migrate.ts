import { query } from 'jsonpath'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/setup'
import {
  BasicArguments,
  getFilename,
  getParsedArgs,
  loadYaml,
  OtomiDebugger,
  setParsedArgs,
  terminal,
} from '../common/utils'

interface Arguments extends BasicArguments {
  file?: string
  valuesFilePath?: string
  applyDeletions?: boolean
  applyLocations?: boolean
  applyMutations?: boolean
  preJsonPathExpr?: string
  postJsonPathExpr?: string
}

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const deletionInPlace = (): void => {
  const argv: Arguments = getParsedArgs()
  if (argv.file) {
    const yaml = loadYaml(argv.file)
    debug.info('Old yaml:')
    debug.info(yaml)

    if (argv.preJsonPathExpr) {
      debug.info(argv.preJsonPathExpr)

      const filteredResults = query(yaml, '$.cluster')
      debug.info('New yaml:')
      debug.info(filteredResults)
    }
  }
  // writeFileSync(yamlFilePath)
}

// export const migrate = (): void => {}

export const module = {
  command: `${cmdName} [args..]`,
  describe: 'migrate',
  builder: (parser: Argv): Argv =>
    parser.options({
      file: {
        alias: ['f'],
        string: true,
      },
      'values-file-path': {
        alias: ['S'],
        string: true,
      },
      'apply-deletions': {
        alias: ['d'],
        boolean: true,
        default: false,
      },
      'apply-locations': {
        alias: ['l'],
        boolean: true,
        default: false,
      },
      'apply-mutations': {
        alias: ['m'],
        boolean: true,
        default: false,
      },
      'pre-json-path-expr': {
        alias: ['pre'],
        string: true,
        conflicts: ['values-file-path'],
      },
      'post-json-path-expr': {
        alias: ['post'],
        string: true,
        conflicts: ['values-file-path'],
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)

    await prepareEnvironment({ skipKubeContextCheck: true })
    if (argv.applyDeletions) deletionInPlace()
  },
}
