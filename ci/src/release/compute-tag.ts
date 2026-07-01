import { execSync } from 'child_process'
import { config } from 'dotenv'
import { appendFileSync } from 'fs'
import { computeNextRcTag, computeStableTag } from './version'

export function computeTag(branchTags: string[], branchName: string, promote: boolean): string {
  return promote ? computeStableTag(branchTags) : computeNextRcTag(branchTags, branchName)
}

if (require.main === module) {
  config()
  const promote = process.env.PROMOTE_TO_STABLE === 'true'
  const branchName = process.env.RELEASE_BRANCH!

  const tagsRaw = execSync('git tag --merged HEAD', { encoding: 'utf8' })
  const branchTags = tagsRaw.trim().split('\n').filter(Boolean)

  const tag = computeTag(branchTags, branchName, promote)
  console.log(`Computed tag: ${tag}`)

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `tag=${tag}\n`)
    appendFileSync(process.env.GITHUB_OUTPUT, `is_prerelease=${tag.includes('-rc.')}\n`)
  }
}
