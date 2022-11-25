/* eslint-disable @typescript-eslint/no-unused-vars */
import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { generateSecrets } from 'src/common/values'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $ } from 'zx'
/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

const cmdName = getFilename(__filename)

const playground = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:playGround`)
  const cmd = 'pwd && ls -als .'
  const q = $.quote
  $.quote = (v) => v
  const res = await $`${cmd.split(' ')}`
  console.log(JSON.stringify(await generateSecrets({})))
}

export const module = {
  command: `${cmdName} [opts...]`,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await playground()
  },
}
