import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'
import { incrementRc, nextPatchRc } from './version'

const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')
const dryRun = process.env.DRY_RUN === 'true'

const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
const currentVersion: string = pkg.version
const isRc = currentVersion.includes('-rc.')
const nextVersion = isRc ? incrementRc(currentVersion) : nextPatchRc(currentVersion)

console.log(`Auto-bumping from ${currentVersion} → ${nextVersion}`)

if (dryRun) {
  console.log(`[dry-run] Would bump package.json to ${nextVersion} and push`)
  process.exit(0)
}

execSync(`npm version ${nextVersion} --no-git-tag-version`, { cwd: repoRoot, stdio: 'inherit' })
execSync(`git add package.json package-lock.json`, { cwd: repoRoot, stdio: 'inherit' })
execSync(`git commit -m "chore(release): bump to v${nextVersion}"`, { cwd: repoRoot, stdio: 'inherit' })
execSync(`git push`, { cwd: repoRoot, stdio: 'inherit' })
