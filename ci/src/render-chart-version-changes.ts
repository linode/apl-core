import { execFileSync } from 'child_process'
import { parse } from 'yaml'

interface Dependency {
  name: string
  alias?: string
  version: string
}

interface ChartYaml {
  dependencies: Dependency[]
}

export interface ChartRow {
  name: string
  oldVersion: string
  newVersion: string
  notes: 'New' | 'Removed' | 'Updated'
}

function tagExists(tag: string): boolean {
  const ref = `refs/tags/${tag}`
  try {
    execSync(`git rev-parse --verify ${JSON.stringify(ref)}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function loadChartAtTag(tag: string): Map<string, string> {
  const spec = `${tag}:chart/chart-index/Chart.yaml`
  const raw = execSync(`git show ${JSON.stringify(spec)}`, { encoding: 'utf8' })
  const chart = parse(raw) as ChartYaml
  return buildDepMap(chart)
}

export function buildDepMap(chart: ChartYaml): Map<string, string> {
  const map = new Map<string, string>()
  for (const dep of chart.dependencies ?? []) {
    map.set(dep.alias ?? dep.name, dep.version)
  }
  return map
}

export function diffCharts(oldDeps: Map<string, string>, newDeps: Map<string, string>): ChartRow[] {
  const added: ChartRow[] = []
  const removed: ChartRow[] = []
  const updated: ChartRow[] = []

  for (const [name, newVersion] of newDeps) {
    const oldVersion = oldDeps.get(name)
    if (oldVersion === undefined) {
      added.push({ name, oldVersion: '', newVersion, notes: 'New' })
    } else if (oldVersion !== newVersion) {
      updated.push({ name, oldVersion, newVersion, notes: 'Updated' })
    }
  }

  for (const [name, oldVersion] of oldDeps) {
    if (!newDeps.has(name)) {
      removed.push({ name, oldVersion, newVersion: '', notes: 'Removed' })
    }
  }

  const byName = (a: ChartRow, b: ChartRow) => a.name.localeCompare(b.name)
  return [...added.sort(byName), ...removed.sort(byName), ...updated.sort(byName)]
}

export function renderTable(rows: ChartRow[]): string {
  const lines = [
    '| App Name | Old Version | New Version | Notes |',
    '|----------|-------------|-------------|-------|',
  ]
  for (const row of rows) {
    lines.push(`| ${row.name} | ${row.oldVersion} | ${row.newVersion} | ${row.notes} |`)
  }
  return lines.join('\n')
}

function main() {
  const [oldTag, newTag] = process.argv.slice(2)

  if (!oldTag || !newTag) {
    console.error('Usage: tsx src/render-chart-version-changes.ts <old-tag> <new-tag>')
    process.exit(1)
  }

  if (!tagExists(oldTag)) {
    console.error(`Error: tag '${oldTag}' not found`)
    process.exit(1)
  }
  if (!tagExists(newTag)) {
    console.error(`Error: tag '${newTag}' not found`)
    process.exit(1)
  }

  const oldDeps = loadChartAtTag(oldTag)
  const newDeps = loadChartAtTag(newTag)
  const rows = diffCharts(oldDeps, newDeps)

  if (rows.length === 0) {
    console.log('No chart dependency changes between ' + oldTag + ' and ' + newTag)
    return
  }

  console.log(renderTable(rows))
}

if (require.main === module) {
  main()
}
