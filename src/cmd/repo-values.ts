import { prepareEnvironment } from 'src/common/cli'
import { getFilename } from 'src/common/utils'
import { getTeamConfig, objectToYaml } from 'src/common/values'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'

const cmdName = getFilename(__filename)

interface Arguments extends BasicArguments {
  filesOnly?: boolean
  excludeSecrets?: boolean
  withWorkloadValues?: boolean
}

const values = async (argv: Arguments): Promise<void> => {
  const teamConfig = await getTeamConfig()
  console.log(objectToYaml(teamConfig, 2, 1000))
}

export const module = {
  command: cmdName,
  describe:
    'Show helmfile values for target cluster (--files-only: only values stored on disk, --exclude-secrets: omit secrets --with-workload-values: include workload values)',
  builder: (parser: Argv): Argv => parser.options({}),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await values(argv)
  },
}
