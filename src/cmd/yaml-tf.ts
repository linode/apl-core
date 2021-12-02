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

export const deleteGivenJsonPath = (): Record<string, any> | undefined => {
  const argv = getParsedArgs() as Arguments
  let yaml

  if (argv.filePath && argv.lhsExpression) {
    yaml = loadYaml(argv.filePath)
    unset(yaml, argv.lhsExpression)
  }
  return yaml
}

export const moveGivenJsonPath = (): Record<string, any> | undefined => {
  const argv = getParsedArgs() as Arguments
  let yaml

  if (argv.filePath && argv.lhsExpression) {
    yaml = loadYaml(argv.filePath)
    const moveValue = get(yaml, argv.lhsExpression, 'err!')
    if (unset(yaml, argv.lhsExpression) && yaml && argv.rhsExpression) set(yaml, argv.rhsExpression, moveValue)
  }
  return yaml
}

export const mutateGivenJsonPath = (): Record<string, any> | undefined => {
  const argv = getParsedArgs() as Arguments
  let yaml

  if (argv.filePath) {
    yaml = loadYaml(argv.filePath)
    if (yaml && argv.lhsExpression && Array.isArray(argv.rhsExpression))
      // The mutate magic could be expanded to support more rich use cases.
      set(yaml, argv.lhsExpression, get(yaml, argv.lhsExpression).replace(...argv.rhsExpression))
  }
  return yaml
}

export const module = {
  command: `${cmdName} [options]`,
  describe: `Prototype applying jsonpath-like queries, e.g. for schema evolution.`,
  builder: (parser: Argv): Argv =>
    parser
      .command({
        command: 'delete',
        describe: `Remove key/value pair given jsonpath query.\n\n [examples]\n - ${cmdName} delete -f my.yaml --lhs a.b.c \n`,
        builder: (): Argv => parser,
        handler: async (argv: Arguments) => {
          setParsedArgs(argv)
          await prepareEnvironment({ skipKubeContextCheck: true })
          debug.info(deleteGivenJsonPath())
        },
      })
      .command({
        command: 'move',
        describe: `Move key/value pair given jsonpath query.\n\n [examples]\n - ${cmdName} move -f my.yaml --lhs a.b.c --rhs a.b.c.d \n`,
        builder: (): Argv => parser,
        handler: async (argv: Arguments) => {
          setParsedArgs(argv)
          await prepareEnvironment({ skipKubeContextCheck: true })
          debug.info(moveGivenJsonPath())
        },
      })
      .command({
        command: 'mutate',
        describe: `str.replace() key/value pair given jsonpath query.\n\n [examples]\n - ${cmdName} mutate -f my.yaml --lhs a.b.c --rhs $my-regexp --rhs $my-other-regexp \n`,
        builder: (): Argv => parser,
        handler: async (argv: Arguments) => {
          setParsedArgs(argv)
          await prepareEnvironment({ skipKubeContextCheck: true })
          debug.info(mutateGivenJsonPath())
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
