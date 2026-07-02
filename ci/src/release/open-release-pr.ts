import { execSync } from 'child_process'
import { config } from 'dotenv'
import { readFileSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path, { join } from 'path'



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
  const releaseBranch = process.env.RELEASE_BRANCH!
  const baseBranch = process.env.BASE_BRANCH!
  const dryRun = process.env.DRY_RUN === 'true'
  const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')

  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
  const version: string = pkg.version
  const title = `release: ${releaseBranch.replace('releases/', '')}`
  const body = buildPrBody(version)

  if (dryRun) {
    console.log('[dry-run] Would open PR:')
    console.log(`  title: ${title}`)
    console.log(`  head:  ${releaseBranch} → ${baseBranch}`)
    console.log(`  body:\n${body}`)
    return
  }

  const bodyFile = join(tmpdir(), `pr-body-${Date.now()}.md`)
  writeFileSync(bodyFile, body)
  try {
    execSync(`gh pr create --title "${title}" --body-file "${bodyFile}" --base "${baseBranch}" --head "${releaseBranch}"`, {
      stdio: 'inherit',
    })
  } finally {
    unlinkSync(bodyFile)
  }
}

if (require.main === module) {
  config()
  main().catch((err) => { console.error(err.message); process.exit(1) })
}
