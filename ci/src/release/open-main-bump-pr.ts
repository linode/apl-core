import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import path from 'path'
import { nextMainVersion } from './version'

async function main() {
  const version = process.env.VERSION!
  const baseBranch = process.env.BASE_BRANCH!
  const dryRun = process.env.DRY_RUN === 'true'
  const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')

  const nextVersion = nextMainVersion(version)
  const bumpBranch = `chore/bump-main-v${nextVersion}`
  const title = `chore: bump main to v${nextVersion} after cutting release/v${version.split('.').slice(0, 2).join('.')}`
  const body = `Automated version bump after cutting the \`release/v${version.split('.').slice(0, 2).join('.')}\` release cycle branch.\n\n- Bumps \`package.json\` to \`${nextVersion}\``

  if (dryRun) {
    console.log('[dry-run] Would create main bump PR:')
    console.log(`  branch: ${bumpBranch}`)
    console.log(`  title:  ${title}`)
    console.log(`  next version: ${nextVersion}`)
    return
  }

  execSync(`git checkout "${baseBranch}"`, { cwd: repoRoot, stdio: 'inherit' })
  execSync(`git pull`, { cwd: repoRoot, stdio: 'inherit' })
  execSync(`git checkout -b "${bumpBranch}"`, { cwd: repoRoot, stdio: 'inherit' })
  execSync(`npm version ${nextVersion} --no-git-tag-version`, { cwd: repoRoot, stdio: 'inherit' })
  execSync(`git add package.json package-lock.json`, { cwd: repoRoot, stdio: 'inherit' })
  execSync(`git commit -m "chore(release): bump main to v${nextVersion}"`, { cwd: repoRoot, stdio: 'inherit' })
  execSync(`git push -u origin "${bumpBranch}"`, { cwd: repoRoot, stdio: 'inherit' })

  const bodyFile = join(tmpdir(), `pr-body-${Date.now()}.md`)
  writeFileSync(bodyFile, body)
  try {
    execSync(`gh pr create --title "${title}" --body-file "${bodyFile}" --base "${baseBranch}" --head "${bumpBranch}"`, {
      cwd: repoRoot,
      stdio: 'inherit',
    })
  } finally {
    unlinkSync(bodyFile)
  }
}

main().catch((err) => { console.error(err.message); process.exit(1) })
