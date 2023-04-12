import { prepareEnvironment } from 'src/common/cli'
import { Arguments } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { getFilename } from 'src/common/utils'
import { helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'

const cmdName = getFilename(__filename)

const checkConformance = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:checkConformance`)
  const exists = (await $`sonobuoy status`).exitCode === 0
  if (!exists) {
    d.log('Running conformance tests with sonobuoy. This might take over an hour...')
    await $`sonobuoy run --wait`
  }
  d.log('Retrieving results...')
  const results = (
    await nothrow(
      $`sonobuoy results $(sonobuoy retrieve) --mode=detailed | jq 'select(.name | contains("[Conformance]"))' | jq 'select(.status=="failed")'`,
    )
  ).stdout
  if (results === '') d.log('All conformance tests passed!')
  else {
    d.error(results)
    throw new Error('Some conformance tests had errors!')
  }
}

export const module = {
  command: cmdName,
  describe: 'Run sonobuoy conformance tests to see if Otomi can run on the cluster',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    await checkConformance()
  },
}
