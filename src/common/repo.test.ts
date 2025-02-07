import { FileMap, getFilePath, getJsonPath, hasCorrespondingDecryptedFile } from 'src/common/repo'
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
