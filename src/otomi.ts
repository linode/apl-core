#!/usr/bin/env node --nolazy -r ts-node/register
import { existsSync, mkdirSync, symlinkSync, unlinkSync } from 'fs'
import { dirname } from 'path'
import { CommandModule } from 'yargs'
import { commands, defaultCommand } from './cmd'
import { scriptName } from './common/cli'
import { terminal } from './common/debug'
import { env } from './common/envalid'
import { basicOptions, parser } from './common/yargs'

console.profile('otomi')
const d = terminal('global')
const terminalScale = 0.75

const startup = async (): Promise<void> => {
  const link = `${process.cwd()}/env`
  if (!env.ENV_DIR) process.env.ENV_DIR = `${process.cwd()}/env`
  // create symlink to make env dir approachable from relative path
  if (!env.IN_DOCKER && env.OTOMI_DEV && env.ENV_DIR) {
    if (existsSync(link)) unlinkSync(link)
    symlinkSync(env.ENV_DIR, link)
  }
  // create gcloud symlink to be able to refresh token
  if (env.GCLOUD_BIN) {
    const gcloudBinLoc = '/home/app/tools/gsdk/bin'
    if (!existsSync(env.GCLOUD_BIN)) mkdirSync(dirname(env.GCLOUD_BIN), { recursive: true })
    if (existsSync(env.GCLOUD_BIN)) unlinkSync(env.GCLOUD_BIN)
    symlinkSync(gcloudBinLoc, env.GCLOUD_BIN)
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
    d.error(error)
    if (
      `${error}`.includes('Unknown command') ||
      `${error}`.includes('Not enough non-option arguments: got 0') ||
      `${error}`.includes('No arguments were passed')
    )
      parser.showHelp()
    process.exit(1)
  } finally {
    // devs should not manually have to remove docker symlinks from docker runs before:
    if (!env.IN_DOCKER && env.OTOMI_DEV && env.ENV_DIR) unlinkSync(`${process.cwd()}/env`)
    console.profileEnd('otomi')
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
;(async () => {
  await startup()
})()
