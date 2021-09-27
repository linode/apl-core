/**
 * Note that running this script requires "--experimental-specifier-resolution=node" due to this being an ESM module
 * https://nodejs.org/api/esm.html#esm_mandatory_file_extensions
 * https://nodejs.org/api/esm.html#esm_customizing_esm_specifier_resolution_algorithm
 * Run as:
 *  node --experimental-specifier-resolution=node ./dist/otomi.js -- <args>
 */

import { CommandModule } from 'yargs'
import { commands, defaultCommand } from './cmd'
import { env } from './common/envalid'
import { scriptName } from './common/setup'
import { parser, terminal } from './common/utils'
import { basicOptions } from './common/yargs-opts'

console.profile('otomi')
const debug = terminal('global')
const terminalScale = 0.75
const isAutoCompletion = process.argv.includes('--get-yargs-completions')
if (!env.IN_DOCKER && !isAutoCompletion) {
  debug.error(process.argv)
  debug.error('Please run this script using the `otomi` entry script')
  process.exit(1)
}
if (env.TESTING) {
  process.env.AZURE_CLIENT_ID = 'somevalue'
  process.env.AZURE_CLIENT_SECRET = 'somesecret'
}

try {
  parser.scriptName(scriptName)
  commands.map((cmd: CommandModule) =>
    parser.command(cmd !== defaultCommand ? cmd : { ...cmd, command: [cmd.command as string, '$0'] }),
  )
  parser
    .option(basicOptions)
    .wrap(Math.min(parser.terminalWidth() * terminalScale, 256 * terminalScale))
    .fail((e) => {
      throw e
    })
    .env('OTOMI')
    .help('help')
    .alias('h', 'help')
    .strictCommands()
    .demandCommand()
    .completion('completion', false)
  await parser.parseAsync()
} catch (error) {
  if (`${error}`.includes('Unknown command') || `${error}`.includes('Not enough non-option arguments: got 0'))
    parser.showHelp()
  else debug.error(error)
  process.exit(1)
} finally {
  console.profileEnd('otomi')
}
