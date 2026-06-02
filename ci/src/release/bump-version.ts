import { execSync } from 'child_process'
import path from 'path'
import { cycleStartVersion } from './version'

const minorVersion = process.env.MINOR_VERSION!
const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')
const dryRun = process.env.DRY_RUN === 'true'

const version = cycleStartVersion(minorVersion)

if (dryRun) {
  console.log(`[dry-run] Would run: npm version ${version} --no-git-tag-version`)
  process.exit(0)
}

execSync(`npm version ${version} --no-git-tag-version`, { cwd: repoRoot, stdio: 'inherit' })
console.log(`Bumped package.json to ${version}`)
