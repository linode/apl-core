import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import path from 'path'

const branch = process.env.RELEASE_BRANCH!
const dryRun = process.env.DRY_RUN === 'true'
const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')

const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
const version: string = pkg.version

if (dryRun) {
  console.log(`[dry-run] Would commit and push ${branch} with version ${version}`)
  process.exit(0)
}

execSync(`git add package.json package-lock.json`, { cwd: repoRoot, stdio: 'inherit' })
execSync(`git commit -m "chore(release): bump to v${version}"`, { cwd: repoRoot, stdio: 'inherit' })
execSync(`git push -u origin "${branch}"`, { cwd: repoRoot, stdio: 'inherit' })
console.log(`Committed and pushed ${branch}`)
