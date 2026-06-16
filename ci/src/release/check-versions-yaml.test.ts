import { findInvalidVersions, findMissingGithubTags, findMissingImages, findRcVersions, githubRepoForEntry, imageRefForEntry, parseVersionsYaml } from './check-versions-yaml'

describe('parseVersionsYaml', () => {
  it('parses all key-value pairs', () => {
    const content = `api: 1.4.0\nconsole: 1.4.0-rc.1\n`
    expect(parseVersionsYaml(content)).toEqual({ api: '1.4.0', console: '1.4.0-rc.1' })
  })

  it('returns empty object for empty content', () => {
    expect(parseVersionsYaml('')).toEqual({})
  })
})

describe('findInvalidVersions', () => {
  it('returns entries whose values are not semver', () => {
    const versions = { api: 'main', console: '1.4.0', tools: 'latest' }
    expect(findInvalidVersions(versions)).toEqual([
      { key: 'api', value: 'main' },
      { key: 'tools', value: 'latest' },
    ])
  })

  it('returns empty array when all values are valid semver', () => {
    const versions = { api: '1.4.0', console: '1.4.0-rc.1', tasks: '2.1.0' }
    expect(findInvalidVersions(versions)).toEqual([])
  })

  it('accepts rc versions as valid', () => {
    const versions = { api: '6.0.0-rc.2' }
    expect(findInvalidVersions(versions)).toEqual([])
  })

  it('accepts v-prefixed semver (Docker tag format)', () => {
    const versions = { api: 'v5.0.0', console: 'v1.4.0-rc.1' }
    expect(findInvalidVersions(versions)).toEqual([])
  })

  it('rejects branch names and non-semver strings', () => {
    const versions = { api: 'releases/v1.4', tasks: 'main' }
    expect(findInvalidVersions(versions)).toEqual([
      { key: 'api', value: 'releases/v1.4' },
      { key: 'tasks', value: 'main' },
    ])
  })

  it('reports all invalid entries, not just the first', () => {
    const versions = { api: 'main', console: 'main', tools: 'main' }
    expect(findInvalidVersions(versions)).toHaveLength(3)
  })
})

describe('findRcVersions', () => {
  it('returns entries whose values contain an rc suffix', () => {
    const versions = { api: '1.4.0-rc.1', console: '1.4.0', tools: '2.0.0-rc.3' }
    expect(findRcVersions(versions)).toEqual([
      { key: 'api', value: '1.4.0-rc.1' },
      { key: 'tools', value: '2.0.0-rc.3' },
    ])
  })

  it('returns empty array when no rc versions are present', () => {
    const versions = { api: '1.4.0', console: '2.0.0', tasks: '6.0.0' }
    expect(findRcVersions(versions)).toEqual([])
  })

  it('reports all rc entries, not just the first', () => {
    const versions = { api: '1.0.0-rc.1', console: '2.0.0-rc.2', tools: '3.0.0-rc.3' }
    expect(findRcVersions(versions)).toHaveLength(3)
  })
})

describe('imageRefForEntry', () => {
  it.each([
    ['api',          'v5.0.0', 'linode/apl-api:v5.0.0'],
    ['console',      'v5.0.0', 'linode/apl-console:v5.0.0'],
    ['consoleLogin', 'v5.0.0', 'linode/apl-console:v5.0.0'],
    ['tasks',        'v4.0.0', 'linode/apl-tasks:v4.0.0'],
    ['tools',        'v2.11.2','linode/apl-tools:v2.11.2'],
  ])('imageRefForEntry(%s, %s) → %s', (key, version, expected) => {
    expect(imageRefForEntry(key, version)).toBe(expected)
  })

  it('returns null for aplCharts', () => {
    expect(imageRefForEntry('aplCharts', 'v1.5.0')).toBeNull()
  })

  it('returns null for unknown keys', () => {
    expect(imageRefForEntry('unknown', 'v1.0.0')).toBeNull()
  })
})

describe('findMissingImages', () => {
  it('returns empty array when all images exist', () => {
    const versions = { api: 'v5.0.0', console: 'v5.0.0' }
    expect(findMissingImages(versions, () => true)).toEqual([])
  })

  it('returns the ref for a missing image', () => {
    const versions = { api: 'v5.0.0' }
    expect(findMissingImages(versions, () => false)).toEqual(['linode/apl-api:v5.0.0'])
  })

  it('skips aplCharts — it has no container image', () => {
    const versions = { aplCharts: 'v1.5.0' }
    expect(findMissingImages(versions, () => false)).toEqual([])
  })

  it('reports all missing images, not just the first', () => {
    const versions = { api: 'v5.0.0', tasks: 'v4.0.0', tools: 'v2.11.2' }
    expect(findMissingImages(versions, () => false)).toHaveLength(3)
  })
})

describe('githubRepoForEntry', () => {
  it.each([
    ['api',          'linode/apl-api'],
    ['console',      'linode/apl-console'],
    ['consoleLogin', 'linode/apl-console'],
    ['tasks',        'linode/apl-tasks'],
    ['aplCharts',    'linode/apl-charts'],
  ])('githubRepoForEntry(%s) → %s', (key, expected) => {
    expect(githubRepoForEntry(key)).toBe(expected)
  })

  it('returns null for tools', () => {
    expect(githubRepoForEntry('tools')).toBeNull()
  })

  it('returns null for unknown keys', () => {
    expect(githubRepoForEntry('unknown')).toBeNull()
  })
})

describe('findMissingGithubTags', () => {
  it('returns empty array when tag exists', () => {
    const versions = { aplCharts: 'v1.5.0' }
    expect(findMissingGithubTags(versions, () => true)).toEqual([])
  })

  it('returns a descriptor when the tag is missing', () => {
    const versions = { aplCharts: 'v1.5.0' }
    expect(findMissingGithubTags(versions, () => false)).toEqual(['linode/apl-charts@v1.5.0'])
  })

  it('checks all known entries including container image components', () => {
    const versions = { api: 'v5.0.0', console: 'v5.0.0' }
    expect(findMissingGithubTags(versions, () => false)).toEqual([
      'linode/apl-api@v5.0.0',
      'linode/apl-console@v5.0.0',
    ])
  })

})
