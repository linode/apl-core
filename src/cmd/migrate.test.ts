import {
  applyChanges,
  Changes,
  filterChanges,
  preservePvcStorageClassInRawValues,
  processDeletionEntry,
} from 'src/cmd/migrate'
import { terminal } from '../common/debug'
import { env } from '../common/envalid'

// Mock external dependencies at the top level - BEFORE imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'my-fixed-uuid'),
}))

jest.mock('../common/k8s')
jest.mock('../common/values')
jest.mock('../common/yargs')
jest.mock('../common/utils')
jest.mock('../common/sealed-secrets')
jest.mock('zx')
jest.mock('@linode/kubeseal-encrypt')
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}))

jest.mock('src/common/envalid', () => ({
  env: {
    isDev: false,
    DISABLE_SYNC: false,
    ENV_DIR: '/test/env',
  },
}))

describe('Upgrading values', () => {
  const oldVersion = 1
  const mockValues = {
    teamConfig: {
      teamA: {
        services: [
          { name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }], type: 'cluster' },
          { name: 'svc2', prop: 'replaceMe', di: [{ ok: 'replaceMeNot' }], type: 'public' },
        ],
      },
    },
    versions: { specVersion: oldVersion },
    some: { json: { path: 'bla' }, k8sVersion: '1.18' },
  }
  const mockChanges: Changes = [
    {
      version: 1,
      // mutations: [{ 'some.version': 'printf "v%s" .prev' }],
    },
    {
      version: 2,
      deletions: ['some.bla.path'],
      relocations: [{ 'some.json': 'some.bla' }],
    },
    {
      version: 3,
      mutations: [
        // { 'some.k8sVersion': 'printf "v%s" .prev' },
        { 'teamConfig.{team}.services[].prop': 'replaced' },
        // { 'teamConfig.{team}.services[].bla[].ok': 'print .prev "ee"' },
      ],
      renamings: [{ 'somefile.yaml': 'newloc.yaml' }],
    },
    {
      version: 4,
      deletions: [
        // { 'some.k8sVersion': 'printf "v%s" .prev' },
        'teamConfig.{team}.services[].type',
        // { 'teamConfig.{team}.services[].bla[].ok': 'print .prev "ee"' },
      ],
    },
  ]

  describe('Filter changes', () => {
    it('should only select changes whose version >= current version', () => {
      expect(filterChanges(oldVersion, mockChanges)).toEqual(mockChanges.slice(1, 4))
    })
  })
  describe('Apply changes to values', () => {
    const deps = {
      cd: jest.fn(),
      rename: jest.fn(),
      hfValues: jest.fn().mockReturnValue(mockValues),
      terminal,
      writeValues: jest.fn(),
    }
    it('should apply changes to values', async () => {
      await applyChanges(mockChanges.slice(1), false, deps)
      expect(deps.writeValues).toHaveBeenCalledWith(
        {
          teamConfig: {
            teamA: {
              services: [
                { name: 'svc1', prop: 'replaced', bla: [{ ok: 'replaceMe' }] },
                { name: 'svc2', prop: 'replaced', di: [{ ok: 'replaceMeNot' }] },
              ],
            },
          },
          some: { bla: {}, k8sVersion: '1.18' },
          versions: { specVersion: 4 },
        },
        true,
      )
      expect(deps.rename).toHaveBeenCalledWith(`somefile.yaml`, `newloc.yaml`, false)
    })
  })
})

describe('Values migrations', () => {
  let values: any = undefined
  let valuesChanges: any = undefined
  let deps: any = undefined
  beforeEach(() => {
    values = {
      teamConfig: {
        teamA: {
          services: [{ name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] }],
          monitoringStack: true,
        },
        teamB: {
          services: [{ name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] }],
          monitoringStack: false,
        },
      },
      versions: { specVersion: 1 },
    }

    valuesChanges = {
      version: 2,
      deletions: ['teamConfig.{team}.monitoringStack'],
      additions: [
        { 'teamConfig.{team}.managedMonitoring.grafana': 'true' },
        { 'teamConfig.{team}.managedMonitoring.prometheus': 'true' },
        { 'teamConfig.{team}.managedMonitoring.alertmanager': 'true' },
      ],
    }
    deps = {
      cd: jest.fn(),
      rename: jest.fn(),
      hfValues: jest.fn().mockReturnValue(values),
      terminal,
      writeValues: jest.fn(),
    }
  })
  it('should apply changes to team values', async () => {
    await applyChanges([valuesChanges], false, deps)
    expect(deps.writeValues).toHaveBeenCalledWith(
      {
        teamConfig: {
          teamA: {
            services: [{ name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] }],
            managedMonitoring: {
              grafana: 'true',
              prometheus: 'true',
              alertmanager: 'true',
            },
          },
          teamB: {
            services: [{ name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] }],
            managedMonitoring: {
              grafana: 'true',
              prometheus: 'true',
              alertmanager: 'true',
            },
          },
        },
        versions: { specVersion: 2 },
      },
      true,
    )
  })
})

describe('processDeletionEntry', () => {
  const mockDeleteFile = jest.fn()
  const deps = { deleteFile: mockDeleteFile }

  beforeEach(() => {
    mockDeleteFile.mockClear()
  })

  it('should unset the path in values', () => {
    const values: any = { apps: { myApp: { key: 'value' } }, other: 'data' }
    processDeletionEntry('apps.myApp', values, deps)
    expect(values.apps.myApp).toBeUndefined()
    expect(values.other).toBe('data')
  })

  it('should delete app files when entry matches apps.<name>', () => {
    const values: any = { apps: { myApp: {} } }
    processDeletionEntry('apps.myApp', values, deps)
    expect(mockDeleteFile).toHaveBeenCalledTimes(2)
    expect(mockDeleteFile).toHaveBeenCalledWith('env/apps/myApp.yaml')
  })

  it('should not delete files when entry does not match apps.<name>', () => {
    const values: any = { some: { path: 'value' } }
    processDeletionEntry('some.path', values, deps)
    expect(mockDeleteFile).not.toHaveBeenCalled()
  })

  it('should not delete files when entry is a nested app path', () => {
    const values: any = { apps: { myApp: { nested: 'value' } } }
    processDeletionEntry('apps.myApp.nested', values, deps)
    expect(mockDeleteFile).not.toHaveBeenCalled()
  })
})

describe('preservePvcStorageClassInRawValues', () => {
  type PreservePvcStorageClassDeps = NonNullable<Parameters<typeof preservePvcStorageClassInRawValues>[1]>

  const makeDeps = (overrides: Partial<PreservePvcStorageClassDeps> = {}): PreservePvcStorageClassDeps => ({
    readPvc: jest.fn(async (_namespace: string, _name: string) => undefined),
    listPvcs: jest.fn(async (_namespace: string, _labelSelector: string) => []),
    ...overrides,
  })

  it('should set app _rawValues and databases.storageClass when pvc storageClass differs from cluster default', async () => {
    const values: Record<string, any> = {
      cluster: { defaultStorageClass: 'linode-block-storage' },
      databases: {
        gitea: {},
        harbor: {},
        keycloak: {},
      },
      apps: {
        gitea: { _rawValues: {} },
        harbor: { _rawValues: {} },
        keycloak: { _rawValues: {} },
        prometheus: { _rawValues: {} },
        'kubeflow-pipelines': { _rawValues: {} },
        'git-server': { _rawValues: {} },
      },
    }

    const readPvc = jest.fn(async (namespace: string, name: string) => {
      const byName: Record<string, any> = {
        'git-server/git-server-data': { spec: { storageClassName: 'legacy-sc' } },
        'gitea/data-gitea-0': { spec: { storageClassName: 'legacy-sc' } },
        'gitea/gitea-backup': { spec: { storageClassName: 'legacy-sc' } },
        'kfp/mysql-pv-claim': { spec: { storageClassName: 'legacy-sc' } },
      }
      return byName[`${namespace}/${name}`]
    })

    const listPvcs = jest.fn(async (namespace: string, labelSelector: string) => {
      const bySelector: Record<string, any[]> = {
        'gitea/cnpg.io/cluster=gitea-db,cnpg.io/pvcRole=PG_DATA': [
          { metadata: { labels: { 'cnpg.io/pvcRole': 'PG_DATA' } }, spec: { storageClassName: 'legacy-sc' } },
        ],
        'harbor/app.kubernetes.io/instance=harbor,component=redis': [{ spec: { storageClassName: 'legacy-sc' } }],
        'harbor/app.kubernetes.io/instance=harbor,component=trivy': [{ spec: { storageClassName: 'legacy-sc' } }],
        'harbor/cnpg.io/cluster=harbor-otomi-db,cnpg.io/pvcRole=PG_DATA': [
          { metadata: { labels: { 'cnpg.io/pvcRole': 'PG_DATA' } }, spec: { storageClassName: 'legacy-sc' } },
        ],
        'keycloak/cnpg.io/cluster=keycloak-db,cnpg.io/pvcRole=PG_DATA': [
          { metadata: { labels: { 'cnpg.io/pvcRole': 'PG_DATA' } }, spec: { storageClassName: 'legacy-sc' } },
        ],
        'monitoring/operator.prometheus.io/name=po-prometheus': [{ spec: { storageClassName: 'legacy-sc' } }],
      }
      return bySelector[`${namespace}/${labelSelector}`] || []
    })

    await preservePvcStorageClassInRawValues(values, makeDeps({ readPvc, listPvcs }))

    expect(values.apps['git-server']._rawValues?.persistence?.storageClass).toBe('legacy-sc')
    expect(values.apps.gitea._rawValues?.global?.storageClass).toBe('legacy-sc')
    expect(values.apps.gitea._rawValues?.giteaBackup?.storageClassName).toBe('legacy-sc')
    expect(values.databases.gitea?.storageClass).toBe('legacy-sc')
    expect(values.apps.harbor._rawValues?.persistence?.persistentVolumeClaim?.redis?.storageClass).toBe('legacy-sc')
    expect(values.apps.harbor._rawValues?.persistence?.persistentVolumeClaim?.trivy?.storageClass).toBe('legacy-sc')
    expect(values.databases.harbor?.storageClass).toBe('legacy-sc')
    expect(values.databases.keycloak?.storageClass).toBe('legacy-sc')
    expect(values.apps['kubeflow-pipelines']._rawValues?.mysql?.storage?.storageClass).toBe('legacy-sc')
    expect(
      values.apps.prometheus._rawValues?.prometheus?.prometheusSpec?.storageSpec?.volumeClaimTemplate?.spec
        ?.storageClassName,
    ).toBe('legacy-sc')
  })

  it('should not set overrides when pvc storageClass equals cluster default', async () => {
    const values: Record<string, any> = {
      cluster: { defaultStorageClass: 'linode-block-storage' },
      databases: {
        gitea: {},
        harbor: {},
        keycloak: {},
      },
      apps: {
        gitea: { _rawValues: {} },
        harbor: { _rawValues: {} },
        keycloak: { _rawValues: {} },
        prometheus: { _rawValues: {} },
        'kubeflow-pipelines': { _rawValues: {} },
        'git-server': { _rawValues: {} },
      },
    }

    const readPvc = jest.fn(async () => ({ spec: { storageClassName: 'linode-block-storage' } }))
    const listPvcs = jest.fn(async () => [{ spec: { storageClassName: 'linode-block-storage' } }])

    await preservePvcStorageClassInRawValues(values, makeDeps({ readPvc, listPvcs }))

    expect(values.apps['git-server']._rawValues).toEqual({})
    expect(values.apps.gitea._rawValues).toEqual({})
    expect(values.apps.harbor._rawValues).toEqual({})
    expect(values.apps.keycloak._rawValues).toEqual({})
    expect(values.apps['kubeflow-pipelines']._rawValues).toEqual({})
    expect(values.apps.prometheus._rawValues).toEqual({})
    expect(values.databases.gitea).toEqual({})
    expect(values.databases.harbor).toEqual({})
    expect(values.databases.keycloak).toEqual({})
  })

  it('should keep existing databases.storageClass overrides', async () => {
    const values: Record<string, any> = {
      cluster: { defaultStorageClass: 'linode-block-storage' },
      databases: {
        gitea: { storageClass: 'preset-db-sc' },
        harbor: { storageClass: 'preset-db-sc' },
        keycloak: { storageClass: 'preset-db-sc' },
      },
    }

    const listPvcs = jest.fn(async (namespace: string, labelSelector: string) => {
      const bySelector: Record<string, any[]> = {
        'gitea/cnpg.io/cluster=gitea-db,cnpg.io/pvcRole=PG_DATA': [
          { metadata: { labels: { 'cnpg.io/pvcRole': 'PG_DATA' } }, spec: { storageClassName: 'legacy-sc' } },
        ],
        'harbor/cnpg.io/cluster=harbor-otomi-db,cnpg.io/pvcRole=PG_DATA': [
          { metadata: { labels: { 'cnpg.io/pvcRole': 'PG_DATA' } }, spec: { storageClassName: 'legacy-sc' } },
        ],
        'keycloak/cnpg.io/cluster=keycloak-db,cnpg.io/pvcRole=PG_DATA': [
          { metadata: { labels: { 'cnpg.io/pvcRole': 'PG_DATA' } }, spec: { storageClassName: 'legacy-sc' } },
        ],
      }
      return bySelector[`${namespace}/${labelSelector}`] || []
    })

    await preservePvcStorageClassInRawValues(values, makeDeps({ listPvcs }))

    expect(values.databases.gitea.storageClass).toBe('preset-db-sc')
    expect(values.databases.harbor.storageClass).toBe('preset-db-sc')
    expect(values.databases.keycloak.storageClass).toBe('preset-db-sc')
  })
})
