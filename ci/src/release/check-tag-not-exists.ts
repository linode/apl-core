import { execSync } from 'child_process'

const tag = process.env.RELEASE_TAG!

try {
  execSync(`git rev-parse --verify "refs/tags/${tag}"`, { stdio: 'pipe' })
  console.error(`Tag "${tag}" already exists. Aborting to prevent duplicate release.`)
  process.exit(1)
} catch {
  console.log(`Tag "${tag}" does not exist — safe to create`)
}
