import { get, set, unset } from 'lodash'
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
  filePath: string
  lhsExpression: string
  rhsExpression?: string | string[]
}

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const migrateDelete = (): Record<string, any> | undefined => {
  const argv = getParsedArgs() as Arguments
  let yaml

  if (argv.filePath && argv.lhsExpression) {
    yaml = loadYaml(argv.filePath)
    unset(yaml, argv.lhsExpression)
  }
  return yaml
}

export const migrateMove = (): Record<string, any> | undefined => {
  const argv = getParsedArgs() as Arguments
  let yaml

  if (argv.filePath && argv.lhsExpression) {
    yaml = loadYaml(argv.filePath)
    const moveValue = get(yaml, argv.lhsExpression, 'err!')
    if (unset(yaml, argv.lhsExpression) && yaml && argv.rhsExpression) set(yaml, argv.rhsExpression, moveValue)
  }
  return yaml
}

const mutate = (yaml: Record<string, any>, lhs: string, rhs: string[]): Record<string, any> => {
  return set(yaml, lhs, get(yaml, lhs).replace(...rhs))
}

export const migrateMutate = (): Record<string, any> | undefined => {
  const argv = getParsedArgs() as Arguments
  let yaml

  if (argv.filePath) {
    yaml = loadYaml(argv.filePath)
    if (yaml && argv.lhsExpression && Array.isArray(argv.rhsExpression))
      mutate(yaml, argv.lhsExpression, argv.rhsExpression)
  }
  return yaml
}

export const module = {
  command: `${cmdName} [options]`,
  describe: `Migrates otomi-values according to Otomi values-schema evolution.\n This command is suitable for prototyping jsonpath-like queries.`,
  builder: (parser: Argv): Argv =>
    parser
      .command({
        command: 'delete',
        describe: '',
        builder: (): Argv => parser,
        handler: async (argv: Arguments) => {
          setParsedArgs(argv)
          await prepareEnvironment({ skipKubeContextCheck: true })
          debug.info(migrateDelete())
        },
      })
      .command({
        command: 'move',
        describe: '',
        builder: (): Argv => parser,
        handler: async (argv: Arguments) => {
          setParsedArgs(argv)
          await prepareEnvironment({ skipKubeContextCheck: true })
          debug.info(migrateMove())
        },
      })
      .command({
        command: 'mutate',
        describe: '',
        builder: (): Argv => parser,
        handler: async (argv: Arguments) => {
          setParsedArgs(argv)
          await prepareEnvironment({ skipKubeContextCheck: true })
          debug.info(migrateMutate())
        },
      })
      .options({
        'file-path': {
          alias: ['f'],
          string: true,
          demandOption: true,
        },
        'lhs-expression': {
          alias: ['lhs'],
          string: true,
          demandOption: true,
        },
        'rhs-expression': {
          alias: ['rhs'],
          string: true,
        },
      }),
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
  },
}
