import { unset } from 'lodash'
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
  jsonPathExpr?: string
  postJsonPathExpr?: string
}

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

export const migrateDelete = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  if (argv.file && typeof argv.file === 'string') {
    const yaml = loadYaml(argv.file)
    debug.info('Old yaml:')
    debug.info(yaml)

    if (argv.jsonPathExpr) {
      if (unset(yaml, argv.jsonPathExpr)) {
        debug.info('New yaml:')
        debug.info(yaml)
        await writeValuesToFile(argv.file, yaml as Record<string, any>)
      }
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
        builder() {
          console.log('builder barr!')
        },
        handler: (a) => {
          console.log('handler barr!')
        },
      })
      .command({
        command: 'mutate',
        description: '',
        builder() {
          console.log('builder barr!')
        },
        handler: (a) => {
          console.log('handler barr!')
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
      })
  },

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)

    await prepareEnvironment({ skipKubeContextCheck: true })
  },
}
