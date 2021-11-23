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
}

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const deletionInPlace = (): void => {
  const argv: Arguments = getParsedArgs()

  if (argv.file) {
    const yaml = loadYaml(argv.file)
    debug.info(yaml)
  }
  // writeFileSync(yamlFilePath)
}

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
        default: true,
      },
      'apply-locations': {
        alias: ['l'],
        boolean: true,
        default: true,
      },
      'apply-mutations': {
        alias: ['m'],
        boolean: true,
        default: true,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    deletionInPlace()
  },
}
