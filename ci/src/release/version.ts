import semver from 'semver'

const VERSION_RE = /^\d+\.\d+\.\d+(-rc\.\d+)?$/
const MINOR_VERSION_RE = /^v\d+\.\d+$/

export function validateVersion(version: string): boolean {
  return VERSION_RE.test(version)
}

export function validateMinorVersion(minorVersion: string): boolean {
  return MINOR_VERSION_RE.test(minorVersion)
}

export function stripV(minorVersion: string): string {
  return minorVersion.replace(/^v/, '')
}

export function cycleStartVersion(minorVersion: string): string {
  return `${minorVersion}.0-rc.1`
}

export function releaseBranchName(version: string): string {
  const [major, minor] = version.split('.')
  return `releases/v${major}.${minor}`
}

export function incrementRc(version: string): string {
  const [base, pre] = version.split('-rc.')
  return `${base}-rc.${parseInt(pre, 10) + 1}`
}

export function promoteToStable(version: string): string {
  return version.replace(/-rc\.\d+$/, '')
}

export function nextPatchRc(version: string): string {
  const [major, minor, patch] = version.split('.').map(Number)
  return `${major}.${minor}.${patch + 1}-rc.1`
}

export function nextMainVersion(version: string): string {
  const base = promoteToStable(version)
  const [major, minor] = base.split('.').map(Number)
  return `${major}.${minor + 1}.0-rc.0`
}

export function versionMatchesBranch(version: string, branch: string): boolean {
  return releaseBranchName(version) === branch
}

function filterSemver(tags: string[]): string[] {
  return tags.filter((t) => semver.valid(t))
}

export function previousStableTag(tags: string[]): string | null {
  const stable = filterSemver(tags)
    .filter((t) => !t.includes('-rc.'))
    .sort((a, b) => semver.rcompare(a, b))
  return stable.length >= 2 ? stable[1] : null
}

export function previousStableTagBefore(newTag: string, tags: string[]): string | null {
  const stable = filterSemver(tags)
    .filter((t) => !t.includes('-rc.'))
    .filter((t) => semver.lt(t, newTag))
    .sort((a, b) => semver.rcompare(a, b))
  return stable.length > 0 ? stable[0] : null
}

export function previousRcTag(currentTag: string, tags: string[]): string | null {
  const [majorMinorPatch] = currentTag.replace('v', '').split('-rc.')
  const [major, minor] = majorMinorPatch.split('.')
  const sameSeries = filterSemver(tags)
    .filter((t) => t !== currentTag)
    .filter((t) => t.includes('-rc.'))
    .filter((t) => {
      const bare = t.replace('v', '').split('-rc.')[0]
      const [m, n] = bare.split('.')
      return m === major && n === minor
    })
    .sort((a, b) => semver.rcompare(a, b))
  return sameSeries.length > 0 ? sameSeries[0] : null
}

export function computeStableTag(branchTags: string[]): string {
  const rcs = filterSemver(branchTags).filter((t) => t.includes('-rc.')).sort((a, b) => semver.rcompare(a, b))
  if (rcs.length === 0) throw new Error('No RC tags on branch — cannot promote to stable without a prior RC')
  return `v${promoteToStable(stripV(rcs[0]))}`
}

export function computeNextRcTag(branchTags: string[], branchName: string): string {
  const [major, minor] = stripV(branchName.replace('releases/', '')).split('.')
  const seriesRcs = filterSemver(branchTags)
    .filter((t) => t.includes('-rc.'))
    .filter((t) => {
      const [m, n] = stripV(t).split('-rc.')[0].split('.')
      return m === major && n === minor
    })
    .sort((a, b) => semver.rcompare(a, b))
  if (seriesRcs.length === 0) return `v${major}.${minor}.0-rc.1`
  return `v${incrementRc(stripV(seriesRcs[0]))}`
}

export function computeDevVersion(highestTag: string, shortSha: string): string {
  const [major, minor, patch] = promoteToStable(stripV(highestTag)).split('.').map(Number)
  return `${major}.${minor}.${patch + 1}-dev.${shortSha}`
}

export function highestTag(tags: string[]): string | null {
  const valid = tags.filter((t) => semver.valid(t)).sort((a, b) => semver.rcompare(a, b))
  return valid.length > 0 ? valid[0] : null
}

export function highestStableTag(tags: string[]): string | null {
  const stable = filterSemver(tags).filter((t) => !t.includes('-rc.')).sort((a, b) => semver.rcompare(a, b))
  return stable.length > 0 ? stable[0] : null
}

export function isHighestStableTag(newTag: string, existingTags: string[]): boolean {
  const stableTags = filterSemver(existingTags).filter((t) => !t.includes('-rc.'))
  return stableTags.every((t) => semver.gt(newTag, t))
}

export function computeReleaseBranchName(tag: string, bumpType: 'minor' | 'major'): string {
  const [major, minor] = stripV(tag).split('.').map(Number)
  const [newMajor, newMinor] = bumpType === 'major' ? [major + 1, 0] : [major, minor + 1]
  return `releases/v${newMajor}.${newMinor}`
}
