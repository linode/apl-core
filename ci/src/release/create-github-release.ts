import { execSync } from 'child_process'
import { config } from 'dotenv'
import { previousRcTag, previousStableTagBefore } from './version'

async function main() {
  const tag = process.env.RELEASE_TAG!
  const isPrerelease = process.env.IS_PRERELEASE === 'true'
  const dryRun = process.env.DRY_RUN === 'true'

  const allTags = execSync('git tag --sort=-v:refname', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter((t) => t.startsWith('v'))

  const previousTag = isPrerelease
    ? previousRcTag(tag, allTags)
    : previousStableTagBefore(tag, allTags)

  const prereleaseFlag = isPrerelease ? '--prerelease' : ''
  const notesStartFlag = previousTag ? `--notes-start-tag "${previousTag}"` : ''
  const rcBanner = isPrerelease
    ? `> ⚠️ This is a release candidate. Do not use in production without testing.\n\n`
    : ''

  console.log(`Creating GitHub release for ${tag}`)
  console.log(`  prerelease: ${isPrerelease}`)
  console.log(`  previous tag: ${previousTag ?? '(none)'}`)

  if (dryRun) {
    console.log(`[dry-run] Would run: gh release create ${tag} --generate-notes ${notesStartFlag} ${prereleaseFlag}`)
    return
  }

  const notesCmd = [
    `gh release create "${tag}"`,
    `--title "Release ${tag}"`,
    `--generate-notes`,
    notesStartFlag,
    prereleaseFlag
  ].filter(Boolean).join(' ')

  execSync(notesCmd, { stdio: 'inherit' })
}

config()
main().catch((err) => { console.error(err.message); process.exit(1) })
