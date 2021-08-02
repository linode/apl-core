/**
 * Note that running this script requires "--experimental-specifier-resolution=node" due to this being an ESM module
 * https://nodejs.org/api/esm.html#esm_mandatory_file_extensions
 * https://nodejs.org/api/esm.html#esm_customizing_esm_specifier_resolution_algorithm
 * Run as:
 *  node --experimental-specifier-resolution=node ./dist/otomi.js -- <args>
 */

import { lstatSync, readdirSync } from 'fs'
import { CommandModule } from 'yargs'
import { bootstrap, commands, defaultCommand } from './cmd'
import { terminal } from './common/debug'
import { env } from './common/envalid'
import { otomi } from './common/setup'
import { parser } from './common/utils'
import { basicOptions } from './common/yargs-opts'

const debug = terminal('global')
const terminalScale = 0.75
const isAutoCompletion = process.argv.includes('--get-yargs-completions')
if (!env.OTOMI_IN_DOCKER && !isAutoCompletion) {
  debug.error(process.argv)
  debug.error('Please run this script using the `otomi` entry script')
  process.exit(1)
}

const envDirContent = readdirSync(env.ENV_DIR)
if (envDirContent.length > 0 && !isAutoCompletion) {
  try {
    let errorMessage = ''
    if (!lstatSync(`${env.ENV_DIR}/env`).isDirectory()) errorMessage += `\n${env.ENV_DIR}/env is not a directory`
    if (!lstatSync(`${env.ENV_DIR}/env/charts`).isDirectory())
      errorMessage += `\n${env.ENV_DIR}/env/charts is not a directory`
    if (!lstatSync(`${env.ENV_DIR}/env/cluster.yaml`).isFile())
      errorMessage += `\n${env.ENV_DIR}/env/cluster.yaml is not a file`
    if (!lstatSync(`${env.ENV_DIR}/env/settings.yaml`).isFile())
      errorMessage += `\n${env.ENV_DIR}/env/settings.yaml is not a file`
    if (errorMessage.trim().length > 0) {
      debug.error(`It seems like '${env.ENV_DIR}' is not a valid values repo.${errorMessage}`)
      process.exit(1)
    }
  } catch (error) {
    debug.error(`It seems like '${env.ENV_DIR}' is not a valid values repo.\n${error.message}`)
    process.exit(1)
  }
}

try {
  parser.scriptName(otomi.scriptName)
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
