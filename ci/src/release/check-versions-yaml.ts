import { execSync } from 'child_process'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import path from 'path'
import { validateVersion } from './version'

const IMAGE_MAP: Record<string, string> = {
  api:          'linode/apl-api',
  console:      'linode/apl-console',
  consoleLogin: 'linode/apl-console',
  tasks:        'linode/apl-tasks',
  tools:        'linode/apl-tools',
}

export function parseVersionsYaml(content: string): Record<string, string> {
  return (load(content) as Record<string, string>) ?? {}
}

export function findInvalidVersions(versions: Record<string, string>): Array<{ key: string; value: string }> {
  return Object.entries(versions)
    .filter(([, value]) => !validateVersion(value.replace(/^v/, '')))
    .map(([key, value]) => ({ key, value }))
}

export function findRcVersions(versions: Record<string, string>): Array<{ key: string; value: string }> {
  return Object.entries(versions)
    .filter(([, value]) => value.includes('-rc.'))
    .map(([key, value]) => ({ key, value }))
}

export function imageRefForEntry(key: string, version: string): string | null {
  const repo = IMAGE_MAP[key]
  return repo ? `${repo}:${version}` : null
}

const GITHUB_REPO_MAP: Record<string, string> = {
  api:          'linode/apl-api',
  console:      'linode/apl-console',
  consoleLogin: 'linode/apl-console',
  tasks:        'linode/apl-tasks',
  aplCharts:    'linode/apl-charts',
}

export function githubRepoForEntry(key: string): string | null {
  return GITHUB_REPO_MAP[key] ?? null
}

export function findMissingGithubTags(
  versions: Record<string, string>,
  tagExists: (repo: string, tag: string) => boolean,
): string[] {
  return Object.entries(versions)
    .flatMap(([key, version]) => {
      const repo = githubRepoForEntry(key)
      return repo && !tagExists(repo, version) ? [`${repo}@${version}`] : []
    })
}

export function findMissingImages(
  versions: Record<string, string>,
  imageExists: (ref: string) => boolean,
): string[] {
  return Object.entries(versions)
    .flatMap(([key, version]) => {
      const ref = imageRefForEntry(key, version)
      return ref && !imageExists(ref) ? [ref] : []
    })
}

function main() {
  const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')
  const stable = process.env.STABLE === 'true'
  const content = readFileSync(path.join(repoRoot, 'versions.yaml'), 'utf8')
  const versions = parseVersionsYaml(content)

  const invalid = findInvalidVersions(versions)
  if (invalid.length > 0) {
    console.error(`versions.yaml contains non-semver values:`)
    for (const { key, value } of invalid) {
      console.error(`  ${key}: "${value}"`)
    }
    console.error(`All values must be semver (e.g. v1.4.0 or v1.4.0-rc.1)`)
    process.exit(1)
  }

  if (stable) {
    const rcs = findRcVersions(versions)
    if (rcs.length > 0) {
      console.error(`versions.yaml contains rc versions — stable release requires all versions to be stable:`)
      for (const { key, value } of rcs) {
        console.error(`  ${key}: "${value}"`)
      }
      process.exit(1)
    }
  }

  const missing = findMissingImages(versions, (ref) => {
    try {
      execSync(`docker manifest inspect ${ref}`, { stdio: 'pipe' })
      console.log(`dockerhub.io/${ref}`)
      return true
    } catch {
      return false
    }
  })

  if (missing.length > 0) {
    console.error(`versions.yaml references container images that do not exist:`)
    for (const ref of missing) {
      console.error(`  ${ref}`)
    }
    process.exit(1)
  }

  const missingTags = findMissingGithubTags(versions, (repo, tag) => {
    try {
      execSync(`gh api repos/${repo}/git/ref/tags/${tag}`, { stdio: 'pipe' })
      console.log(`github.com/${repo}@${tag}`)
      return true
    } catch {
      return false
    }
  })

  if (missingTags.length > 0) {
    console.error(`versions.yaml references GitHub tags that do not exist:`)
    for (const ref of missingTags) {
      console.error(`  ${ref}`)
    }
    process.exit(1)
  }

  console.log(`versions.yaml: all ${Object.keys(versions).length} entries are semver-compatible, images exist, and GitHub tags exist`)
}

if (require.main === module) {
  config()
  main()
}
