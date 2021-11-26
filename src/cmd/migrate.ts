import { get, invoke, set, unset } from 'lodash'
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
import { writeValuesToFile } from '../common/values'

interface Arguments extends BasicArguments {
  file?: string
  valuesFilePath?: string
  lhsExpression?: string
  rhsExpression?: string
}

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

const migrateDelete = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  if (argv.file && argv.lhsExpression) {
    const yaml = loadYaml(argv.file)

    if (unset(yaml, argv.lhsExpression)) {
      await writeValuesToFile(argv.file, yaml as Record<string, any>)
    }
  }
}

const migrateMove = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  if (argv.file && argv.lhsExpression) {
    const yaml = loadYaml(argv.file)
    debug.info(`Old yaml: ${JSON.stringify(yaml, null, 2)}`)

    const moveValue = get(yaml, argv.lhsExpression, 'err!')
    if (unset(yaml, argv.lhsExpression) && yaml && argv.rhsExpression) {
      if (set(yaml, argv.rhsExpression, moveValue)) {
        debug.info(`New yaml: ${JSON.stringify(yaml, null, 2)}`)
        await writeValuesToFile(argv.file, yaml)
      }
    }
  }
}

const migrateMutate = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  if (argv.file) {
    const yaml = loadYaml(argv.file)
    debug.info(`Old yaml: ${JSON.stringify(yaml, null, 2)}`)
    debug.info(argv.rhsExpression)
    if (yaml && argv.lhsExpression && argv.rhsExpression) {
      invoke(yaml, argv.lhsExpression, argv.rhsExpression)
      debug.info(`New yaml: ${JSON.stringify(yaml, null, 2)}`)
      await writeValuesToFile(argv.file, yaml)
    }
  }
}

// export const migrate = (): void => {}

export const module = {
  command: `${cmdName} [subcmd] [options]`,
  description: `Migrates otomi-values according to Otomi values-schema evolution.\n This command is suitable for prototyping jsonpath-like queries.`,
  builder: (parser): Argv => {
    return parser
      .command({
        command: 'delete',
        description: '',
        builder: (): Argv => parser,
        handler: async (argv) => {
          setParsedArgs(argv)
          await prepareEnvironment({ skipKubeContextCheck: true })
          await migrateDelete()
        },
      })
      .command({
        command: 'move',
        description: '',
        builder: (): Argv => parser,
        handler: async (argv) => {
          setParsedArgs(argv)
          await prepareEnvironment({ skipKubeContextCheck: true })
          await migrateMove()
        },
      })
      .command({
        command: 'mutate',
        description: '',
        builder: (): Argv => parser,
        handler: async (argv) => {
          setParsedArgs(argv)
          await prepareEnvironment({ skipKubeContextCheck: true })
          await migrateMutate()
        },
      })
      .options({
        file: {
          alias: ['f'],
          string: true,
        },
        'values-file-path': {
          alias: ['V'],
          string: true,
        },
        'lhs-expression': {
          alias: ['lhs'],
          string: true,
          conflicts: ['values-file-path'],
        },
        'rhs-expression': {
          alias: ['rhs'],
          string: true,
          conflicts: ['values-file-path'],
        },
      })
  },

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)

    await prepareEnvironment({ skipKubeContextCheck: true })
  },
}
