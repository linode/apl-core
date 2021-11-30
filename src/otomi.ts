#!/usr/bin/env node --nolazy -r ts-node/register
import { existsSync, symlinkSync, unlinkSync } from 'fs'
import { CommandModule } from 'yargs'
import { commands, defaultCommand } from './cmd'
import { scriptName } from './common/cli'
import { terminal } from './common/debug'
import { env } from './common/envalid'
import { basicOptions, parser } from './common/yargs-opts'

console.profile('otomi')
const debug = terminal('global')
const terminalScale = 0.75

const startup = async (): Promise<void> => {
  const link = `${process.cwd()}/env`
  if (!env.IN_DOCKER && env.OTOMI_DEV && env.ENV_DIR) {
    if (existsSync(link)) unlinkSync(link)
    symlinkSync(env.ENV_DIR, link)
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
    if (!env.IN_DOCKER && env.OTOMI_DEV && env.ENV_DIR) unlinkSync(`${process.cwd()}/env`)
    console.profileEnd('otomi')
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
;(async () => {
  await startup()
})()
