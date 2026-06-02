import { execSync } from 'child_process'
import path from 'path'

const version = process.env.VERSION!
const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')
const dryRun = process.env.DRY_RUN === 'true'

if (dryRun) {
  console.log(`[dry-run] Would run: npm version ${version} --no-git-tag-version`)
  process.exit(0)
}

execSync(`npm version ${version} --no-git-tag-version`, { cwd: repoRoot, stdio: 'inherit' })
console.log(`Bumped package.json to ${version}`)
