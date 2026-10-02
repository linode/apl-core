import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'yaml'

interface AppEntry {
  repo: string
  relatedLinks?: string[]
}

interface AppsYaml {
  appsInfo: Record<string, AppEntry>
}

export interface UrlCheckResult {
  app: string
  url: string
  ok: boolean
  status?: number
  error?: string
}

export function parseAppsYaml(content: string): { app: string; url: string }[] {
  const { appsInfo } = parse(content) as AppsYaml
  const entries: { app: string; url: string }[] = []
  for (const [app, info] of Object.entries(appsInfo)) {
    entries.push({ app, url: info.repo })
    for (const url of info.relatedLinks ?? []) {
      entries.push({ app, url })
    }
  }
  return entries
}
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export async function checkAppUrls(filePath: string, delayMs = 50): Promise<UrlCheckResult[]> {
  const content = readFileSync(filePath, 'utf-8')
  const entries = parseAppsYaml(content)
  return Promise.all(
    entries.map(async ({ app, url }) => {
      await delay(delayMs)
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
        return { app, url, ok: res.ok, status: res.status }
      } catch (err) {
        return { app, url, ok: false, error: (err as Error).message }
      }
    }),
  )
}

async function main() {
  const appsYaml = join(__dirname, '../../apps.yaml')
  const results = await checkAppUrls(appsYaml)
  const failures = results.filter((r) => !r.ok)

  for (const r of results) {
    const label = r.ok ? '✓' : '✗'
    const detail = r.status ? ` (${r.status})` : r.error ? ` (${r.error})` : ''
    console.log(`${label} [${r.app}] ${r.url}${detail}`)
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} URL(s) unreachable`)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
