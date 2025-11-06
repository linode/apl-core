import { terminal } from 'src/common/debug'
import { deployEssential } from 'src/common/hf'
import { getFilename } from 'src/common/utils'
import { CommandModule } from 'yargs'

const cmdName = getFilename(__filename)
const d = terminal(`cmd:${cmdName}:apply-teams`)

export const applyTeams = async (): Promise<boolean> => {
  d.info('Deploying team namespaces')
  const result = await deployEssential(['team=true'], true)

  if (result) {
    d.info('Teams applied')
  } else {
    d.error('Not all teams have been deployed successfully')
  }

  return result
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply all',

  handler: async (): Promise<void> => {
    await applyTeams()
  },
}
