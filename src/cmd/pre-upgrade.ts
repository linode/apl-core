/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { prepareEnvironment } from '../common/cli'
import { getDeploymentState, setDeploymentState } from '../common/k8s'
import { getFilename, loadYaml, rootDir, semverCompare } from '../common/utils'
import { getCurrentVersion } from '../common/values'
import { BasicArguments, getParsedArgs, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)

interface Arguments extends BasicArguments {
  dryRun?: boolean
  r?: string
  release: string
}

interface Change {
  version: string
  releases?: Record<string, string[]>
}

export type Changes = Array<Change>

// select changes after semver version, and always select change with version "dev" for dev purposes
function filterChanges(version: string, changes: Changes): Changes {
  return changes.filter((c) => c.version === 'dev' || semverCompare(version, c.version))
}

/**
 * Checks if any operations need to be ran for releases and executes those.
 */
export const preUpgrade = async (): Promise<void> => {
  const d = console // wrapped stream created by terminal(... is not showing
  const argv = getParsedArgs() as Arguments
  const changes: Changes = loadYaml(`${rootDir}/upgrades.yaml`)?.changes
  const prevVersion: string = (await getDeploymentState()).version || '0.1.0'
  d.info(`Current version of otomi: ${prevVersion}`)
  const filteredChanges = filterChanges(prevVersion, changes)
  if (filteredChanges.length) {
    const r = argv.release
    d.info('Upgrade records detected for release: ', r)
    cd(rootDir)
    const q = $.quote
    $.quote = (v) => v
    for (let i = 0; i < filteredChanges.length; i++) {
      const c: Record<string, any> = filteredChanges[i]
      if (c.releases[r]) {
        const release = c.releases[r]
        for (const op of release.operations || []) {
          d[argv.dryRun ? 'log' : 'info'](`operation: ${op}`)
          if (argv.dryRun) return
          const res = await $`${op} || true`
          if (res.stdout) d.log(res.stdout)
          if (res.stderr) d.error(res.stderr)
        }
      }
    }
    $.quote = q
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
        type: 'string',
        hidden: true,
      },
    }),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await preUpgrade()
  },
}
