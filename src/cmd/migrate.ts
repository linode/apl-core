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
  jsonPathExpr?: string
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

    if (argv.jsonPathExpr) {
      let filteredResults = query(yaml, argv.jsonPathExpr)
      if (filteredResults.length === 1) {
        // eslint-disable-next-line prefer-destructuring
        filteredResults = filteredResults[0]
        debug.info('New yaml:')
        debug.info(filteredResults)
      } else
        throw new Error(
          `The jsonpath expression '${argv.jsonPathExpr}' has multiple results: \n ${JSON.stringify(
            filteredResults,
            null,
            4,
          )}.\n It should have only one result, otherwise the yaml file cannot be modified inplace.`,
        )
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
      'json-path-expr': {
        alias: ['expr'],
        string: true,
        conflicts: ['values-file-path'],
      },
      'post-json-path-expr': {
        alias: ['post-expr'],
        string: true,
        conflicts: ['values-file-path', 'apply-deletions'],
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)

    await prepareEnvironment({ skipKubeContextCheck: true })
    if (argv.applyDeletions) deletionInPlace()
  },
}
