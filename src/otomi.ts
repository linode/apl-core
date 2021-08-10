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
import { env } from './common/envalid'
import { scriptName } from './common/setup'
import { parser, terminal } from './common/utils'
import { basicOptions } from './common/yargs-opts'

const debug = terminal('global')
const terminalScale = 0.75
const isAutoCompletion = process.argv.includes('--get-yargs-completions')
if (!env.IN_DOCKER && !isAutoCompletion) {
  debug.error(process.argv)
  debug.error('Please run this script using the `otomi` entry script')
  process.exit(1)
}

const envDirContent = readdirSync(env.ENV_DIR)

try {
  parser.scriptName(scriptName)
  if (envDirContent.length === 0 && !isAutoCompletion) {
    parser.command(bootstrap)
  } else {
    commands.map((cmd: CommandModule) =>
      parser.command(cmd !== defaultCommand ? cmd : { ...cmd, command: [cmd.command as string, '$0'] }),
    )
  }
  parser
    .option(basicOptions)
    .wrap(Math.min(parser.terminalWidth() * terminalScale, 256 * terminalScale))
    .fail((e) => {
      throw e
    })
    .env('OTOMI')
    .help('help')
    .alias('h', 'help')
    .demandCommand()
    .completion('completion', false)
  await parser.parseAsync()
} catch (error) {
  parser.showHelp()
  let errData = error.message
  if (env.OTOMI_DEV) {
    errData = error
  }
  debug.error(errData)
  process.exit(1)
}
