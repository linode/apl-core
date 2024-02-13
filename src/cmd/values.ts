import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { hfValues } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { stringify } from 'yaml'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)

interface Arguments extends BasicArguments {
  filesOnly?: boolean
  excludeSecrets?: boolean
  withWorkloadValues?: boolean
}

const values = async (argv: Arguments): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:values`)
  d.info('Get values')
  const hfVal = await hfValues({
    filesOnly: argv.filesOnly,
    excludeSecrets: argv.excludeSecrets,
    withWorkloadValues: argv.withWorkloadValues,
  })
  d.info('Print values')
  console.log(stringify(hfVal))
}

export const module = {
  command: cmdName,
  describe:
    'Show helmfile values for target cluster (--files-only: only values stored on disk, --exclude-secrets: omit secrets --with-workload-values: include workload values)',
  builder: (parser: Argv): Argv =>
    parser.options({
      filesOnly: {
        boolean: true,
        default: false,
      },
      excludeSecrets: {
        boolean: true,
        default: false,
      },
      withWorkloadValues: {
        boolean: true,
        default: false,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await values(argv)
  },
}
