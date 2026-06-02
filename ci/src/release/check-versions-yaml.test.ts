import { parseVersionsYaml, findInvalidVersions, findRcVersions } from './check-versions-yaml'

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

  it('rejects branch names and non-semver strings', () => {
    const versions = { api: 'release/v1.4', console: 'v1.4.0', tasks: 'main' }
    expect(findInvalidVersions(versions)).toEqual([
      { key: 'api', value: 'release/v1.4' },
      { key: 'console', value: 'v1.4.0' },
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
