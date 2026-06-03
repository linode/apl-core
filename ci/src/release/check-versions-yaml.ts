import { readFileSync } from 'fs'
import path from 'path'
import { load } from 'js-yaml'
import { validateVersion } from './version'

export function parseVersionsYaml(content: string): Record<string, string> {
  return (load(content) as Record<string, string>) ?? {}
}

export function findInvalidVersions(versions: Record<string, string>): Array<{ key: string; value: string }> {
  return Object.entries(versions)
    .filter(([, value]) => !validateVersion(value))
    .map(([key, value]) => ({ key, value }))
}

export function findRcVersions(versions: Record<string, string>): Array<{ key: string; value: string }> {
  return Object.entries(versions)
    .filter(([, value]) => value.includes('-rc.'))
    .map(([key, value]) => ({ key, value }))
}

if (require.main === module) {
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
    console.error(`All values must be semver (e.g. 1.4.0 or 1.4.0-rc.1)`)
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

  console.log(`versions.yaml: all ${Object.keys(versions).length} entries are semver-compatible`)
}
