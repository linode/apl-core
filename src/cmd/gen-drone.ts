/* eslint-disable no-param-reassign */
import { terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { BasicArguments } from 'src/common/yargs'
import { Argv } from 'yargs'

export interface Arguments extends BasicArguments {
  path?: string
  dryRun?: boolean
}

const cmdName = getFilename(__filename)

export const module = {
  command: cmdName,
  describe: undefined,
  builder: (parser: Argv): Argv =>
    parser.options({
      'dry-run': {
        alias: ['d'],
        boolean: true,
        default: false,
        hidden: true,
      },
    }),

  handler: (argv: Arguments): void => {
    const d = terminal(`cmd:${cmdName}:genDrone`)
    d.info('Drone has been deprecated')
  },
}
