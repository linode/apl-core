/* eslint-disable prefer-destructuring */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { readFile, writeFile } from 'fs-extra'
import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { getFilename, rootDir } from 'src/common/utils'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

const cmdName = getFilename(__filename)

const playground = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:playGround`)
  const snapshotFile = `${rootDir}/tests/template-snapshot.yaml`
  const snapshotFileOut = `${rootDir}/tests/snapshots/template.yaml`
  const output = await readFile(snapshotFile, 'utf8')
  // remove uuidv4 generated ids
  const out = output
    .replace(/-[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{10}/g, '')
    .replace(/^#.*/gm, '')
    .replace(/^[ ]+#.*/gm, '')
    .replace(/[ ]{1}#.*/g, '')
    .replace(/[\n]+/g, '\n')
  await writeFile(snapshotFileOut, out)
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
