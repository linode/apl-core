/**
 * Note that running this script requires "--experimental-specifier-resolution=node" due to this being an ESM module
 * https://nodejs.org/api/esm.html#esm_mandatory_file_extensions
 * https://nodejs.org/api/esm.html#esm_customizing_esm_specifier_resolution_algorithm
 * Run as:
 *  node --experimental-specifier-resolution=node ./dist/otomi.js -- <args>
 */

import { readdirSync } from 'fs'
import { CommandModule } from 'yargs'
import { bootstrap, commands, defaultCommand } from './cmd'
import { terminal } from './common/debug'
import { ENV, LOG_LEVELS, parser } from './common/no-deps'
import { otomi } from './common/setup'

const debug = terminal('global')
const terminalScale = 0.75
if (!('OTOMI_IN_DOCKER' in process.env))
  debug.exit(1, 'Please run the script in the "otomi/core" docker container using the `otomi` entry script')

try {
  parser.scriptName(otomi.scriptName)
  if (ENV.DIR && readdirSync(ENV.DIR).length === 0) {
    parser.command({ ...bootstrap, command: [bootstrap.command, '$0'] })
  } else {
    commands.map((cmd: CommandModule) =>
      parser.command(cmd !== defaultCommand ? cmd : { ...cmd, command: [cmd.command as string, '$0'] }),
    )
  }
  parser
    .option({
      'log-level': {
        choices: Object.entries(LOG_LEVELS)
          .filter((val) => Number.isNaN(Number(val[0])))
          .map((val) => val[0]),
        default: LOG_LEVELS[LOG_LEVELS.WARN],
      },
      'skip-cleanup': {
        alias: 's',
        boolean: true,
        default: false,
      },
      'set-context': {
        alias: 'c',
        boolean: true,
        default: false,
      },
      verbose: {
        alias: 'v',
        count: true,
        coerce: (val: number) =>
          Math.min(
            val,
            Object.keys(LOG_LEVELS)
              .filter((logLevelVal) => !Number.isNaN(Number(logLevelVal)))
              .map(Number)
              .reduce((prev, curr) => Math.max(prev, curr)),
          ),
      },
      'no-interactive': {
        alias: 'ni',
        boolean: true,
        default: false,
      },
    })
    .wrap(Math.min(parser.terminalWidth() * terminalScale, 256 * terminalScale))
    .fail((e) => {
      throw e
    })
    .help('help')
    .alias('h', 'help')
    .demandCommand()
  // .completion()
  ENV.PARSED_ARGS = await parser.parseAsync()
} catch (error) {
  parser.showHelp()
  let errData = error.message
  if ('OTOMI_DEV' in process.env && Boolean(process.env.OTOMI_DEV)) {
    errData = error
  }
  debug.exit(1, errData)
}
