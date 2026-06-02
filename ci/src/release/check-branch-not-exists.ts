import { execSync } from 'child_process'
import { releaseBranchName } from './version'

const version = process.env.VERSION!
const branch = releaseBranchName(version)

try {
  execSync(`git ls-remote --exit-code origin refs/heads/${branch}`, { stdio: 'pipe' })
  console.error(`Branch "${branch}" already exists. Aborting to prevent cycle restart.`)
  process.exit(1)
} catch {
  console.log(`Branch "${branch}" does not exist — safe to create`)
}
