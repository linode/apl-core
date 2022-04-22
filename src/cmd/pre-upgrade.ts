/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { Argv } from 'yargs'
import { $, nothrow } from 'zx'
import pkg from '../../package.json'
import { prepareEnvironment } from '../common/cli'
import { terminal } from '../common/debug'
import { getDeploymentState } from '../common/k8s'
import { getFilename, loadYaml, rootDir } from '../common/utils'
import { getImageTag } from '../common/values'
import { BasicArguments, getParsedArgs, setParsedArgs } from '../common/yargs'
import { setDeploymentState } from './commit'

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
  // The rootDir for helmfile process is /home/app/stack/helmfile.d
  const changes: Changes = loadYaml(`${rootDir}/../code-changes.yaml`)?.changes
  const prevVersion: string = (await getDeploymentState()).version || 0
  d.info(`Current version of otomi: ${prevVersion}`)
  const filteredChanges = filterChanges(Number(prevVersion), changes)
  if (filteredChanges.length) {
    d.log('Operations detected, executing...')
    const r = argv.release
    for (let i = 0; i < filteredChanges.length; i++) {
      const c: Record<string, any> = filteredChanges[i]
      if (c.releases[r]) {
        const release = c.releases[r]
        for (const op of release.operations) {
          if (argv.dryRun) d.log(`operation: ${op}`)
          else {
            const res = await nothrow($`${op.split(' ')}`)
            if (res.stdout) d.debug(res.stdout)
            if (res.stderr) d.error(res.stderr)
          }
        }
      }
    }
    // set latest version deployed in configmap
    const thisTag = await getImageTag()
    const potentialVersion = thisTag.replace('/^v/', '')
    const thisVersion = /^[0-9.]+/.exec(potentialVersion) ? potentialVersion : pkg.version
    // we want minor only, so remove last tuple
    const minor = thisVersion.substring(0, thisVersion.lastIndexOf('.'))
    await setDeploymentState({ version: minor })
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
    await prepareEnvironment({ skipKubeContextCheck: true })
    await preUpgrade()
  },
}
