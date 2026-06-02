import semver from 'semver'

const VERSION_RE = /^\d+\.\d+\.\d+(-rc\.\d+)?$/

export function validateVersion(version: string): boolean {
  return VERSION_RE.test(version)
}

export function releaseBranchName(version: string): string {
  const [major, minor] = version.split('.')
  return `release/v${major}.${minor}`
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

export function previousStableTag(tags: string[]): string | null {
  const stable = tags
    .filter((t) => !t.includes('-rc.'))
    .sort((a, b) => semver.rcompare(a, b))
  return stable.length >= 2 ? stable[1] : null
}

export function previousStableTagBefore(newTag: string, tags: string[]): string | null {
  const stable = tags
    .filter((t) => !t.includes('-rc.'))
    .filter((t) => semver.lt(t, newTag))
    .sort((a, b) => semver.rcompare(a, b))
  return stable.length > 0 ? stable[0] : null
}

export function previousRcTag(currentTag: string, tags: string[]): string | null {
  const [majorMinorPatch] = currentTag.replace('v', '').split('-rc.')
  const [major, minor] = majorMinorPatch.split('.')
  const sameSeries = tags
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

export function isHighestStableTag(newTag: string, existingTags: string[]): boolean {
  const stableTags = existingTags.filter((t) => !t.includes('-rc.'))
  return stableTags.every((t) => semver.gt(newTag, t))
}
