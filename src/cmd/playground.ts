import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/cli'
import { terminal } from '../common/debug'
import { setDeploymentState } from '../common/k8s'
import { getFilename } from '../common/utils'
import { BasicArguments, setParsedArgs } from '../common/yargs'
/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

const cmdName = getFilename(__filename)

const playground = async (): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const d = terminal(`cmd:${cmdName}:playGround`)
  process.env.VERBOSITY = 3
  await setDeploymentState({ status: 'deployed' })
  // await Promise.resolve()
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
