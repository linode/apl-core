/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import { prepareEnvironment } from '../common/cli'
import { terminal } from '../common/debug'
import { getDeploymentState, setDeploymentState } from '../common/k8s'
import { getFilename, loadYaml, rootDir } from '../common/utils'
import { getCurrentVersion } from '../common/values'
import { BasicArguments, getParsedArgs, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)

interface Arguments extends BasicArguments {
  dryRun?: boolean
  r?: string
  release: string
}

interface Change {
  version: number
  releases?: Record<string, string[]>
}

export type Changes = Array<Change>

function filterChanges(version: number, changes: Changes): Changes {
  return changes.filter((c) => c.version - version > 0)
}

/**
 * Checks if any operations need to be ran for releases and executes those.
 */
export const preUpgrade = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:upgrade`)
  const argv = getParsedArgs() as Arguments
  const changes: Changes = loadYaml(`${rootDir}/upgrades.yaml`)?.changes
  const prevVersion: string = (await getDeploymentState()).version || '0'
  // we want minor only, so remove last tuple
  const minor = prevVersion.substring(0, prevVersion.lastIndexOf('.'))
  d.info(`Current version of otomi: ${prevVersion}`)
  const filteredChanges = filterChanges(Number(minor), changes)
  if (filteredChanges.length) {
    d.info('Upgrade records detected')
    const r = argv.release
    for (let i = 0; i < filteredChanges.length; i++) {
      const c: Record<string, any> = filteredChanges[i]
      if (c.releases[r]) {
        const release = c.releases[r]
        for (const op of release.blockingOperations || []) {
          d[argv.dryRun ? 'log' : 'info'](`blockingOperation: ${op}`)
          if (argv.dryRun) return
          const res = await nothrow($`${op.split(' ')}`)
          if (res.stdout) d.debug(res.stdout)
          if (res.stderr) d.error(res.stderr)
        }
        for (const op of release.nonBlockingOperations || []) {
          d[argv.dryRun ? 'log' : 'info'](`nonBlockingOperation: ${op}`)
          if (argv.dryRun) return
          const res = await nothrow($`${op.split(' ')} || true`)
          if (res.stdout) d.debug(res.stdout)
          if (res.stderr) d.error(res.stderr)
        }
      }
    }
    // set latest version deployed in configmap
    const version = await getCurrentVersion()
    await setDeploymentState({ version })
  } else d.info('No pre-upgrade operations detected, skipping')
}

export const module = {
  command: cmdName,
  hidden: true,
  describe: 'Pre-upgrade release',
  builder: (parser: Argv): Argv =>
    parser.options({
      'dry-run': {
        alias: ['d'],
        boolean: true,
        default: false,
        hidden: true,
      },
      release: {
        alias: ['r'],
        string: true,
        hidden: true,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await preUpgrade()
  },
}
