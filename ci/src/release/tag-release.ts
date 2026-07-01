import { execSync } from 'child_process'
import { config } from 'dotenv'

config()

const releaseTag = process.env.RELEASE_TAG!
const dryRun = process.env.DRY_RUN === 'true'

if (dryRun) {
  console.log(`[dry-run] Would create and push tag ${releaseTag}`)
  process.exit(0)
}

execSync(`git tag -a "${releaseTag}" -m "Release ${releaseTag}"`, { stdio: 'inherit' })
execSync(`git push --follow-tags`, { stdio: 'inherit' })
console.log(`Tagged and pushed: ${releaseTag}`)
