/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { prepareEnvironment } from '../common/cli'
import { hfValues } from '../common/hf'
import { getDeploymentState, setDeploymentState } from '../common/k8s'
import { getFilename, guccify, loadYaml, rootDir, semverCompare } from '../common/utils'
import { getCurrentVersion } from '../common/values'
import { BasicArguments, setParsedArgs } from '../common/yargs'

const cmdName = getFilename(__filename)

interface Arguments {
  dryRun?: boolean
  r?: string
  release?: string
}

interface CommandArguments extends Arguments, BasicArguments {}

interface Change {
  version: string
  releases?: Record<string, string[]>
  operations?: string[]
}

export type Changes = Array<Change>

// select changes after semver version, and always select change with version "dev" for dev purposes
function filterChanges(version: string, changes: Changes): Changes {
  return changes.filter((c) => c.version === 'dev' || semverCompare(version, c.version))
}

async function execute(d: typeof console, dryRun: boolean, operations: string[], values: Record<string, any>) {
  for (const o of operations) {
    const matches: string[] = []
    const opStr = o.replace(/(\$\([^)]*\)|`[^`]*`)/g, (match, token) => {
      matches.push(token)
      return `T${matches.length - 1}X`
    })
    const op = (await guccify(opStr, values))
      // .replaceAll(/\n[\W]+done/g, ';done')
      .replaceAll(/do\W?\n/g, 'do ')
      .replaceAll('\n', ';')
      .replaceAll(/T([0-9]+)X/g, (match, token) => matches[token])
    d[dryRun ? 'log' : 'info'](`operation: ${op}`)
    if (dryRun) return
    const res = await $`${op}`
    if (res.stdout) d.log(res.stdout)
    if (res.stderr) d.error(res.stderr)
  }
}

/**
 * Checks if any operations need to be ran for releases and executes those.
 */
export const preUpgrade = async ({ dryRun = false, release }: Arguments): Promise<void> => {
  const d = console // wrapped stream created by terminal(... is not showing
  const changes: Changes = loadYaml(`${rootDir}/upgrades.yaml`)?.changes
  const prevVersion: string = (await getDeploymentState()).version || '0.1.0'
  const values = (await hfValues()) as Record<string, any>
  d.info(`Current version of otomi: ${prevVersion}`)
  const filteredChanges = filterChanges(prevVersion, changes)
  if (filteredChanges.length) {
    cd(rootDir)
    const q = $.quote
    $.quote = (v) => v
    for (let i = 0; i < filteredChanges.length; i++) {
      const c: Record<string, any> = filteredChanges[i]
      if (!release) {
        d.info('Upgrade records detected')
        // before everything
        if (c.operations) await execute(d, dryRun, c.operations, values)
      } else if (c.releases?.[release]) {
        d.info('Upgrade records detected for release: ', release)
        // just in time before a release gets synced
        const r = c.releases[release]
        if (r.operations) await execute(d, dryRun, r.operations, values)
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

  handler: async (argv: CommandArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await preUpgrade(argv)
  },
}
