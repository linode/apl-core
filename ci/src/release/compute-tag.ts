import { config } from 'dotenv'
import { appendFileSync, readFileSync } from 'fs'
import path from 'path'
import { promoteToStable } from './version'



export function computeTag(version: string, promote: boolean): string {
  return `v${promote ? promoteToStable(version) : version}`
}

async function main() {
  const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
  const version: string = pkg.version
  const promote = process.env.PROMOTE_TO_STABLE === 'true'
  const tag = computeTag(version, promote)

  console.log(`Computed tag: ${tag}`)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`)
    appendFileSync(process.env.GITHUB_OUTPUT, `is_prerelease=${tag.includes('-rc.')}\n`)
  }
}

if (require.main === module) {
  config()
  main().catch((err) => { console.error(err.message); process.exit(1) })
}
