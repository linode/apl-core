import { execSync } from 'child_process'
import { config } from 'dotenv'

const branch = process.env.RELEASE_BRANCH!

try {
  execSync(`git ls-remote --exit-code origin refs/heads/${branch}`, { stdio: 'pipe' })
  console.error(`Branch "${branch}" already exists. Aborting to prevent cycle restart.`)
  process.exit(1)
} catch {
  console.log(`Branch "${branch}" does not exist — safe to create`)
}
