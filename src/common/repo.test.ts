import {
  FileMap,
  getFileMaps,
  getFilePath,
  getJsonPath,
  getResourceFileName,
  getResourceName,
  getTeamNameFromJsonPath,
  hasCorrespondingDecryptedFile,
} from 'src/common/repo'
import stubs from 'src/test-stubs'

const { terminal } = stubs

describe('getFilePath', () => {
  it('should get path for apps', () => {
    const fileMap: FileMap = {
      kind: 'AplCoreApp',
      envDir: '/tmp/values',
      jsonPathExpression: 'apps.*',
      pathGlob: '/tmp/values/env/apps/*.{yaml,yaml.dec}',
      processAs: 'mapItem',
      resourceGroup: 'platformApps',
      resourceDir: 'apps',
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
    }
    const data = { id: 'net1' }
    const jsonPath = ['$', 'teamConfig', 'team-a']
    expect(getFilePath(fileMap, jsonPath, data, '')).toEqual('/tmp/values/env/teams/team-a/netpols/net1.yaml')
  })
})

describe('getJsonPath', () => {
  it('should get json path for app', () => {
    const fileMap: FileMap = {
      kind: 'AplCoreApp',
      envDir: '/tmp/values',
      jsonPathExpression: 'apps.*',
      pathGlob: '/tmp/values/env/apps/*.{yaml,yaml.dec}',
      processAs: 'mapItem',
      resourceGroup: 'platformApps',
      resourceDir: 'apps',
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
      if (item.processAs === 'arrayItem') {
        expect(item.jsonPathExpression.endsWith('[*]')).toBe(true)
      }
      if (item.processAs === 'mapItem') {
        expect(item.jsonPathExpression.endsWith('[*]')).toBe(false)
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
    }
    const jsonPath = ['$', 'dns']
    const data = { id: 'a' }
    let filePath = getFilePath(fileMap, jsonPath, data, '')
    expect(filePath).toBe('/tmp/env/users/a.yaml')

    filePath = getFilePath(fileMap, jsonPath, data, 'secrets.')
    expect(filePath).toBe('/tmp/env/users/secrets.a.yaml')
  })
})
