import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { releaseBranchName, cycleStartVersion } from './version'

export function buildPrBody(version: string): string {
  const isRc = version.includes('-rc.')
  const lines = [
    `## Release checklist — v${version}`,
    '',
    '- [ ] Integration tests passed',
    '- [ ] Release notes reviewed',
    '- [ ] Sign-off received',
  ]
  if (!isRc) {
    lines.push('- [ ] Docs updated')
    lines.push('- [ ] Helm chart version confirmed')
    lines.push('- [ ] Announced in #releases')
  }
  return lines.join('\n')
}

async function main() {
  const minorVersion = process.env.MINOR_VERSION!
  const baseBranch = process.env.BASE_BRANCH!
  const dryRun = process.env.DRY_RUN === 'true'
  const version = cycleStartVersion(minorVersion)
  const branch = releaseBranchName(version)
  const title = `release: v${minorVersion}`
  const body = buildPrBody(version)

  if (dryRun) {
    console.log('[dry-run] Would open PR:')
    console.log(`  title: ${title}`)
    console.log(`  head:  ${branch} → ${baseBranch}`)
    console.log(`  body:\n${body}`)
    return
  }

  const bodyFile = join(tmpdir(), `pr-body-${Date.now()}.md`)
  writeFileSync(bodyFile, body)
  try {
    execSync(`gh pr create --title "${title}" --body-file "${bodyFile}" --base "${baseBranch}" --head "${branch}"`, {
      stdio: 'inherit',
    })
  } finally {
    unlinkSync(bodyFile)
  }
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1) })
}
