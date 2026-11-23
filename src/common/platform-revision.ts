import semver from 'semver'

// A release version is `v` followed by an exact semantic version, e.g. v6.5.0 or v6.5.0-rc.5
const isReleaseVersion = (revision: string): boolean => {
  if (!revision.startsWith('v')) return false
  const version = revision.slice(1)
  return semver.valid(version) === version
}

/**
 * The one rule for spelling a platform revision as a git reference.
 * See adr/2026-11-23-argocd-manifest-paths-and-qualified-refs.md
 */
export const qualifyPlatformRevision = (revision: string): string =>
  isReleaseVersion(revision) ? `refs/tags/${revision}` : revision
