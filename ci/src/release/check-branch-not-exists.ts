import { execSync } from 'child_process'

const minorVersion = process.env.MINOR_VERSION!
const branch = `release/${minorVersion}`

try {
  execSync(`git ls-remote --exit-code origin refs/heads/${branch}`, { stdio: 'pipe' })
  console.error(`Branch "${branch}" already exists. Aborting to prevent cycle restart.`)
  process.exit(1)
} catch {
  console.log(`Branch "${branch}" does not exist — safe to create`)
}
