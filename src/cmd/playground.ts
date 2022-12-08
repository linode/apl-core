/* eslint-disable @typescript-eslint/no-unused-vars */
import { JSONSchema } from '@apidevtools/json-schema-ref-parser'
import { writeFile } from 'fs-extra'
import { prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { extract, getFilename, getValuesSchema, rootDir } from 'src/common/utils'
import { BasicArguments, setParsedArgs } from 'src/common/yargs'
import { stringify } from 'yaml'
import { Argv } from 'yargs'
/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

const cmdName = getFilename(__filename)

const playground = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:playGround`)
  const schema = await getValuesSchema()
  const def = extract(schema, 'default', (val, parent: JSONSchema): any => {
    // skip arrays as those are unknown
    if (parent?.items) return undefined
    return val
  })
  await writeFile(`${rootDir}/values/profile-small.yaml`, stringify(def, { aliasDuplicateObjects: false }), 'utf8')
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
