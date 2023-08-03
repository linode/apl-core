import { mkdirSync, rmdirSync } from 'fs'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import { getFilename, rootDir } from 'src/common/utils'
import { HelmArguments, getParsedArgs, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv, CommandModule } from 'yargs'

const cmdName = getFilename(__filename)
const dir = '/tmp/otomi/'
const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  rmdirSync(dir, { recursive: true })
}

const setup = (): void => {
  const argv: HelmArguments = getParsedArgs()
  cleanupHandler(() => cleanup(argv))
  mkdirSync(dir, { recursive: true })
}

const applyE2e = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:apply-e2e`)
  d.info('Start apply-e2e')

  await hf(
    {
      fileOpts: `${rootDir}/helmfile.tpl/helmfile-e2e.yaml`,
      logLevel: logLevelString(),
      args: ['apply'],
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply cypress e2e test',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    setup()
    await prepareEnvironment()
    await applyE2e()
  },
}
