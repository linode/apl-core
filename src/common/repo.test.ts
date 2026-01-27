import {
  FileMap,
  getFileMap,
  getFileMaps,
  getFilePath,
  getJsonPath,
  getResourceFileName,
  getResourceName,
  getTeamNameFromJsonPath,
  getUniqueIdentifierFromFilePath,
  hasCorrespondingDecryptedFile,
  sortTeamConfigArraysByName,
  sortUserArraysByName,
} from 'src/common/repo'
import stubs from 'src/test-stubs'

const { terminal } = stubs

describe('getUniqueIdentifierFromFilePath', () => {
  it('should get user name from .dec file', () => {
    expect(getUniqueIdentifierFromFilePath('secrets.7f5d1670-ea3d-48b5-aa48-0f9d62f80fdb.yaml.dec')).toEqual(
      '7f5d1670-ea3d-48b5-aa48-0f9d62f80fdb',
    )
  })
  it('should get user name', () => {
    expect(getUniqueIdentifierFromFilePath('secrets.7f5d1670-ea3d-48b5-aa48-0f9d62f80fdb.yaml')).toEqual(
      '7f5d1670-ea3d-48b5-aa48-0f9d62f80fdb',
    )
  })
})

describe('getFilePath', () => {
  it('should get path for apps', () => {
    const fileMap: FileMap = {
      kind: 'AplApp',
      envDir: '/tmp/values',
      jsonPathExpression: 'apps.*',
      pathGlob: '/tmp/values/env/apps/*.{yaml,yaml.dec}',
      processAs: 'mapItem',
      resourceGroup: 'platformApps',
      resourceDir: 'apps',
      loadToSpec: true,
    }
    const data = {}
    const jsonPath = ['$', 'apps', 'grafana']
    expect(getFilePath(fileMap, jsonPath, data, '')).toEqual('/tmp/values/env/apps/grafana.yaml')
    expect(getFilePath(fileMap, jsonPath, data, 'secrets.')).toEqual('/tmp/values/env/apps/secrets.grafana.yaml')
  })
  it('should get path for teamA', () => {
    const fileMap: FileMap = {
      kind: 'AplTeamNetworkControl',
      envDir: '/tmp/values',
      jsonPathExpression: 'teamConfig.*.netpols[*]',
      pathGlob: `/tmp/values/env/teams/*/netpols/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'netpols',
      loadToSpec: true,
    }
    const data = { id: 'net1' }
    const jsonPath = ['$', 'teamConfig', 'team-a']
    expect(getFilePath(fileMap, jsonPath, data, '')).toEqual('/tmp/values/env/teams/team-a/netpols/net1.yaml')
  })
})

describe('getJsonPath', () => {
  it('should get json path for app', () => {
    const fileMap: FileMap = {
      kind: 'AplApp',
      envDir: '/tmp/values',
      jsonPathExpression: 'apps.*',
      pathGlob: '/tmp/values/env/apps/*.{yaml,yaml.dec}',
      processAs: 'mapItem',
      resourceGroup: 'platformApps',
      resourceDir: 'apps',
      loadToSpec: true,
    }

    expect(getJsonPath(fileMap, '/tmp/values/env/apps/app1.yaml')).toEqual('apps.app1')
  })
  it('should filter out encrypted files', () => {
    const fileMap: FileMap = {
      kind: 'AplTeamNetworkControl',
      envDir: '/tmp/values',
      jsonPathExpression: 'teamConfig.*.netpols[*]',
      pathGlob: `/tmp/values/env/teams/*/netpols/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'netpols',
      loadToSpec: true,
    }

    expect(getJsonPath(fileMap, '/tmp/values/env/teams/team_a/netpols/net1.yaml')).toEqual('teamConfig.team_a.netpols')
  })
})

describe('hasCorrespondingDecryptedFile', () => {
  it('should filter out encrypted files', () => {
    expect(hasCorrespondingDecryptedFile('test.yaml.dec', ['test.yaml.dec', 'test.yaml'])).toEqual(false)
    expect(hasCorrespondingDecryptedFile('test.yaml', ['test.yaml.dec', 'test.yaml'])).toEqual(true)
  })
})

describe('File map constraints', () => {
  it('should pass constraints', () => {
    const maps = getFileMaps('/tmp')
    maps.forEach((item) => {
      expect(item.jsonPathExpression.startsWith('$.')).toBe(true)
      if (item.processAs === 'arrayItem' || item.kind === 'AplTeamPolicy') {
        expect(item.jsonPathExpression.endsWith('[*]')).toBe(true)
      }
      if (item.processAs === 'mapItem') {
        expect(item.jsonPathExpression.endsWith('[*]') && item.kind !== 'AplTeamPolicy').toBe(false)
      }
      if (item.resourceGroup === 'team') {
        expect(item.jsonPathExpression.startsWith('$.teamConfig.*.')).toBe(true)
        expect(item.pathGlob.startsWith('/tmp/env/teams/*/')).toBe(true)
      }
    })
  })
})

describe('getResourceName', () => {
  let fileMap: FileMap
  beforeEach(() => {
    fileMap = {
      kind: 'AplTeamNetworkControl',
      envDir: '',
      jsonPathExpression: '',
      pathGlob: '',
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: '',
      loadToSpec: true,
    }
  })
  it('should return resource name for team arrayItem', () => {
    fileMap.jsonPathExpression = 'teamConfig.*.netpols[*]'
    fileMap.resourceGroup = 'team'
    fileMap.processAs = 'arrayItem'
    const data = { name: 'test' }
    const name = getResourceName(fileMap, ['$', 'teamConfig', 'demo', 'netpols', '[1]'], data)
    expect(name).toBe('test')
  })
  it('should return resource name for team mapItem', () => {
    fileMap.resourceGroup = 'team'
    fileMap.processAs = 'mapItem'
    const data = { name: 'test' }
    const name = getResourceName(fileMap, ['$', 'teamConfig', 'demo', 'netpols', '[1]'], data)
    expect(name).toBe('demo')
  })
  it('should return resource for platform mapItem', () => {
    fileMap.resourceGroup = 'platformSettings'
    fileMap.processAs = 'mapItem'
    const data = {}
    const name = getResourceName(fileMap, ['$', 'dns'], data)
    expect(name).toBe('dns')
  })
  it('should return resource for platform arrayItem', () => {
    fileMap.resourceGroup = 'users'
    fileMap.processAs = 'arrayItem'
    const data = { id: 'uuid' }
    const name = getResourceName(fileMap, ['$', 'users', '[1]'], data)
    expect(name).toBe('uuid')
  })
})

describe('getResourceFileName', () => {
  let fileMap: FileMap
  beforeEach(() => {
    fileMap = {
      kind: 'AplTeamNetworkControl',
      envDir: '',
      jsonPathExpression: '',
      pathGlob: '',
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: '',
      loadToSpec: true,
    }
  })
  it('should return resource name for team arrayItem', () => {
    fileMap.jsonPathExpression = 'teamConfig.*.netpols[*]'
    fileMap.resourceGroup = 'team'
    fileMap.processAs = 'arrayItem'
    const data = { name: 'a' }
    const name = getResourceFileName(fileMap, ['$', 'teamConfig', 'demo', 'netpols', '[1]'], data)
    expect(name).toBe('a')
  })
  it('should return resource name for team mapItem', () => {
    fileMap.resourceGroup = 'team'
    fileMap.processAs = 'mapItem'
    const data = { name: 'b' }
    const name = getResourceFileName(fileMap, ['$', 'teamConfig', 'settings'], data)
    expect(name).toBe('settings')
  })
  it('should return resource for platform mapItem', () => {
    fileMap.resourceGroup = 'platformSettings'
    fileMap.processAs = 'mapItem'
    const data = {}
    const name = getResourceFileName(fileMap, ['$', 'dns'], data)
    expect(name).toBe('dns')
  })
  it('should return resource for platform arrayItem', () => {
    fileMap.resourceGroup = 'users'
    fileMap.processAs = 'arrayItem'
    const data = { id: 'c' }
    const name = getResourceFileName(fileMap, ['$', 'users', '[1]'], data)
    expect(name).toBe('c')
  })
})

describe('getTeamNameFromJsonPath', () => {
  it('should return team name', () => {
    const name = getTeamNameFromJsonPath(['$', 'teamConfig', 'demo', 'netpols', '[1]'])
    expect(name).toBe('demo')
  })
})

describe('getFilePath', () => {
  it('should return team name', () => {
    const fileMap: FileMap = {
      kind: 'AplTeamNetworkControl',
      envDir: '/tmp',
      jsonPathExpression: '',
      pathGlob: '',
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'netpols',
      loadToSpec: true,
    }
    const jsonPath = ['$', 'teamConfig', 'demo', 'netpols', '[1]']
    const data = { name: 'a' }
    let filePath = getFilePath(fileMap, jsonPath, data, '')
    expect(filePath).toBe('/tmp/env/teams/demo/netpols/a.yaml')

    filePath = getFilePath(fileMap, jsonPath, data, 'secrets.')
    expect(filePath).toBe('/tmp/env/teams/demo/netpols/secrets.a.yaml')
  })

  it('should return file path for platfrom dns', () => {
    const fileMap: FileMap = {
      kind: 'AplDns',
      envDir: '/tmp',
      jsonPathExpression: '',
      pathGlob: '',
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
      loadToSpec: true,
    }
    const jsonPath = ['$', 'dns']
    const data = { name: 'a' }
    let filePath = getFilePath(fileMap, jsonPath, data, '')
    expect(filePath).toBe('/tmp/env/settings/dns.yaml')

    filePath = getFilePath(fileMap, jsonPath, data, 'secrets.')
    expect(filePath).toBe('/tmp/env/settings/secrets.dns.yaml')
  })
  it('should return file path for user', () => {
    const fileMap: FileMap = {
      kind: 'AplUser',
      envDir: '/tmp',
      jsonPathExpression: '',
      pathGlob: '',
      processAs: 'arrayItem',
      resourceGroup: 'users',
      resourceDir: 'users',
      loadToSpec: true,
    }
    const jsonPath = ['$', 'dns']
    const data = { id: 'a' }
    let filePath = getFilePath(fileMap, jsonPath, data, '')
    expect(filePath).toBe('/tmp/env/users/a.yaml')

    filePath = getFilePath(fileMap, jsonPath, data, 'secrets.')
    expect(filePath).toBe('/tmp/env/users/secrets.a.yaml')
  })
})

describe('getFileMap', () => {
  it('should return filemap for sealedsecrets', () => {
    const map = getFileMap('AplTeamSecret', '/tmp')
    expect(map.kind).toBe('AplTeamSecret')
  })
})

describe('sortTeamConfigArraysByName', () => {
  it('should sort arrays with name property in teamConfig', () => {
    const spec = {
      teamConfig: {
        'team-a': {
          services: [
            { name: 'zebra', port: 80 },
            { name: 'alpha', port: 81 },
            { name: 'beta', port: 82 },
          ],
          builds: [
            { name: 'charlie', image: 'img1' },
            { name: 'alpha', image: 'img2' },
          ],
        },
        'team-b': {
          workloads: [
            { name: 'delta', replicas: 2 },
            { name: 'bravo', replicas: 1 },
          ],
        },
      },
    }

    const result = sortTeamConfigArraysByName(spec)

    expect(result.teamConfig['team-a'].services[0].name).toBe('alpha')
    expect(result.teamConfig['team-a'].services[1].name).toBe('beta')
    expect(result.teamConfig['team-a'].services[2].name).toBe('zebra')

    expect(result.teamConfig['team-a'].builds[0].name).toBe('alpha')
    expect(result.teamConfig['team-a'].builds[1].name).toBe('charlie')

    expect(result.teamConfig['team-b'].workloads[0].name).toBe('bravo')
    expect(result.teamConfig['team-b'].workloads[1].name).toBe('delta')
  })

  it('should not sort arrays without name property', () => {
    const spec = {
      teamConfig: {
        'team-a': {
          items: [
            { id: 'third', value: 3 },
            { id: 'first', value: 1 },
            { id: 'second', value: 2 },
          ],
        },
      },
    }

    const result = sortTeamConfigArraysByName(spec)

    expect(result.teamConfig['team-a'].items[0].id).toBe('third')
    expect(result.teamConfig['team-a'].items[1].id).toBe('first')
    expect(result.teamConfig['team-a'].items[2].id).toBe('second')
  })

  it('should handle empty arrays', () => {
    const spec = {
      teamConfig: {
        'team-a': {
          services: [],
        },
      },
    }

    const result = sortTeamConfigArraysByName(spec)

    expect(result.teamConfig['team-a'].services).toEqual([])
  })

  it('should handle missing teamConfig', () => {
    const spec = {
      apps: {
        app1: { enabled: true },
      },
    }

    const result = sortTeamConfigArraysByName(spec)

    expect(result).toEqual(spec)
  })

  it('should handle null or undefined name values', () => {
    const spec = {
      teamConfig: {
        'team-a': {
          services: [
            { name: 'zebra', port: 80 },
            { name: null, port: 81 },
            { name: 'alpha', port: 82 },
            { name: undefined, port: 83 },
          ],
        },
      },
    }

    const result = sortTeamConfigArraysByName(spec)

    // Null and undefined are sorted first (empty string equivalents), then alphabetically
    expect(result.teamConfig['team-a'].services[0].name).toBeNull()
    expect(result.teamConfig['team-a'].services[1].name).toBeUndefined()
    expect(result.teamConfig['team-a'].services[2].name).toBe('alpha')
    expect(result.teamConfig['team-a'].services[3].name).toBe('zebra')
  })

  it('should not modify non-array properties', () => {
    const spec = {
      teamConfig: {
        'team-a': {
          services: [
            { name: 'zebra', port: 80 },
            { name: 'alpha', port: 81 },
          ],
          settings: {
            foo: 'bar',
          },
          description: 'team description',
        },
      },
    }

    const result = sortTeamConfigArraysByName(spec)

    expect(result.teamConfig['team-a'].settings).toEqual({ foo: 'bar' })
    expect(result.teamConfig['team-a'].description).toBe('team description')
    expect(result.teamConfig['team-a'].services[0].name).toBe('alpha')
  })

  it('should sort case-insensitively', () => {
    const spec = {
      teamConfig: {
        'team-a': {
          services: [
            { name: 'Zebra', port: 80 },
            { name: 'alpha', port: 81 },
            { name: 'Beta', port: 82 },
          ],
        },
      },
    }

    const result = sortTeamConfigArraysByName(spec)

    expect(result.teamConfig['team-a'].services[0].name).toBe('alpha')
    expect(result.teamConfig['team-a'].services[1].name).toBe('Beta')
    expect(result.teamConfig['team-a'].services[2].name).toBe('Zebra')
  })

  it('should handle single item arrays', () => {
    const spec = {
      teamConfig: {
        'team-a': {
          services: [{ name: 'only-one', port: 80 }],
        },
      },
    }

    const result = sortTeamConfigArraysByName(spec)

    expect(result.teamConfig['team-a'].services).toEqual([{ name: 'only-one', port: 80 }])
  })
})

describe('sortUserArraysByName', () => {
  it('should sort users array by email alphabetically', () => {
    const spec = {
      users: [
        { email: 'zoe@example.com', name: 'Zoe' },
        { email: 'alice@example.com', name: 'Alice' },
        { email: 'bob@example.com', name: 'Bob' },
      ],
    }

    const result = sortUserArraysByName(spec)

    expect(result.users[0].email).toBe('alice@example.com')
    expect(result.users[1].email).toBe('bob@example.com')
    expect(result.users[2].email).toBe('zoe@example.com')
  })

  it('should handle null or undefined email values', () => {
    const spec = {
      users: [
        { email: 'zoe@example.com', name: 'Zoe' },
        { email: null, name: 'No Email 1' },
        { email: 'alice@example.com', name: 'Alice' },
        { email: undefined, name: 'No Email 2' },
      ],
    }

    const result = sortUserArraysByName(spec)

    // Null and undefined are sorted first (empty string equivalents), then alphabetically
    expect(result.users[0].email).toBeNull()
    expect(result.users[1].email).toBeUndefined()
    expect(result.users[2].email).toBe('alice@example.com')
    expect(result.users[3].email).toBe('zoe@example.com')
  })

  it('should sort case-insensitively', () => {
    const spec = {
      users: [
        { email: 'Zoe@example.com', name: 'Zoe' },
        { email: 'alice@example.com', name: 'Alice' },
        { email: 'Bob@example.com', name: 'Bob' },
      ],
    }

    const result = sortUserArraysByName(spec)

    expect(result.users[0].email).toBe('alice@example.com')
    expect(result.users[1].email).toBe('Bob@example.com')
    expect(result.users[2].email).toBe('Zoe@example.com')
  })

  it('should not sort if users array is empty', () => {
    const spec = {
      users: [],
    }

    const result = sortUserArraysByName(spec)

    expect(result.users).toEqual([])
  })

  it('should not sort if users is not an array', () => {
    const spec = {
      users: 'not an array',
    }

    const result = sortUserArraysByName(spec)

    expect(result.users).toBe('not an array')
  })

  it('should not sort if users is undefined', () => {
    const spec = {
      otherData: 'some data',
    }

    const result = sortUserArraysByName(spec)

    expect(result).toEqual(spec)
  })

  it('should not sort if first user has no email property', () => {
    const spec = {
      users: [
        { name: 'Zoe', id: 3 },
        { name: 'Alice', id: 1 },
        { name: 'Bob', id: 2 },
      ],
    }

    const result = sortUserArraysByName(spec)

    // Order should remain unchanged
    expect(result.users[0].name).toBe('Zoe')
    expect(result.users[1].name).toBe('Alice')
    expect(result.users[2].name).toBe('Bob')
  })

  it('should handle single user array', () => {
    const spec = {
      users: [{ email: 'only@example.com', name: 'Only User' }],
    }

    const result = sortUserArraysByName(spec)

    expect(result.users).toEqual([{ email: 'only@example.com', name: 'Only User' }])
  })

  it('should handle users with identical emails', () => {
    const spec = {
      users: [
        { email: 'same@example.com', name: 'User 1' },
        { email: 'same@example.com', name: 'User 2' },
        { email: 'same@example.com', name: 'User 3' },
      ],
    }

    const result = sortUserArraysByName(spec)

    // All should have the same email, order may vary but should be stable
    expect(result.users.length).toBe(3)
    expect(result.users.every((u) => u.email === 'same@example.com')).toBe(true)
  })

  it('should not modify other properties in spec', () => {
    const spec = {
      users: [
        { email: 'zoe@example.com', name: 'Zoe' },
        { email: 'alice@example.com', name: 'Alice' },
      ],
      apps: {
        app1: { enabled: true },
      },
      cluster: {
        name: 'test-cluster',
      },
    }

    const result = sortUserArraysByName(spec)

    expect(result.apps).toEqual({ app1: { enabled: true } })
    expect(result.cluster).toEqual({ name: 'test-cluster' })
    expect(result.users[0].email).toBe('alice@example.com')
  })

  it('should handle users array with null first element', () => {
    const spec = {
      users: [null, { email: 'alice@example.com', name: 'Alice' }],
    }

    const result = sortUserArraysByName(spec)

    // Should not sort if first element is null
    expect(result.users[0]).toBeNull()
    expect(result.users[1].email).toBe('alice@example.com')
  })

  it('should mutate the original spec object', () => {
    const spec = {
      users: [
        { email: 'zoe@example.com', name: 'Zoe' },
        { email: 'alice@example.com', name: 'Alice' },
      ],
    }

    const result = sortUserArraysByName(spec)

    // The function should return the same reference (mutates in place)
    expect(result).toBe(spec)
    expect(spec.users[0].email).toBe('alice@example.com')
  })
})
