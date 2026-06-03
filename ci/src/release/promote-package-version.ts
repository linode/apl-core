import { execSync } from 'child_process'
import path from 'path'

const releaseTag = process.env.RELEASE_TAG!
const promoteToStable = process.env.PROMOTE_TO_STABLE === 'true'
const dryRun = process.env.DRY_RUN === 'true'
const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')

if (!promoteToStable) {
  console.log('Not promoting to stable — skipping')
  process.exit(0)
}

if (dryRun) {
  console.log(`[dry-run] Would promote package.json to ${releaseTag} and push`)
  process.exit(0)
}

execSync(`npm version ${releaseTag} --no-git-tag-version`, { cwd: repoRoot, stdio: 'inherit' })
execSync(`git add package.json package-lock.json`, { cwd: repoRoot, stdio: 'inherit' })
execSync(`git commit -m "chore(release): promote to ${releaseTag}"`, { cwd: repoRoot, stdio: 'inherit' })
execSync(`git push`, { cwd: repoRoot, stdio: 'inherit' })
console.log(`Promoted package.json to ${releaseTag} and pushed`)
