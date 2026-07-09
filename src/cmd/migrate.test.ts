import {
  applyChanges,
  Changes,
  filterChanges,
  preservePvcStorageClassInRawValues,
  processDeletionEntry,
  removeSopsArtifacts,
  sopsMigration,
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

describe('sopsMigration', () => {
  const mockTerminal = terminal
  const mockExistsSync = jest.fn()
  const mockGlobSync = jest.fn()
  const mockGetExistingSealedSecretsCert = jest.fn()
  const mockGetPemFromCertificate = jest.fn()
  const mockGenerateSealedSecretsKeyPair = jest.fn()
  const mockCreateSealedSecretsKeySecret = jest.fn()
  const mockBuildSecretToNamespaceMap = jest.fn()
  const mockCreateSealedSecretManifest = jest.fn()
  const mockCreateUserSealedSecretManifests = jest.fn()
  const mockWriteSealedSecretManifests = jest.fn()
  const mockApplySealedSecretManifestsFromDir = jest.fn().mockResolvedValue(undefined)
  const mockRestartSealedSecretsController = jest.fn().mockResolvedValue(undefined)
  const mockGetK8sSecret = jest.fn().mockResolvedValue(undefined)
  const mockGetSchemaSecretsPaths = jest.fn()
  const mockRemoveSopsArtifacts = jest.fn()
  const mockSetGitConfig = jest.fn()
  const mockGetOldGitConfig = jest.fn().mockResolvedValue({ username: 'otomi-admin', password: 'otomi-password' })
  const mockEnsureNamespaceExists = jest.fn()

  const makeDeps = () => ({
    existsSync: mockExistsSync,
    globSync: mockGlobSync,
    terminal: mockTerminal,
    getOrCreateSealedSecretsPem: jest.fn().mockImplementation(async (innerDeps: any) => {
      const cert = await innerDeps.getExistingSealedSecretsCert()
      if (cert) return innerDeps.getPemFromCertificate(cert)
      const { certificate, privateKey } = innerDeps.generateSealedSecretsKeyPair()
      await innerDeps.createSealedSecretsKeySecret(certificate, privateKey)
      return innerDeps.getPemFromCertificate(certificate)
    }),
    getExistingSealedSecretsCert: mockGetExistingSealedSecretsCert,
    getPemFromCertificate: mockGetPemFromCertificate,
    generateSealedSecretsKeyPair: mockGenerateSealedSecretsKeyPair,
    createSealedSecretsKeySecret: mockCreateSealedSecretsKeySecret,
    buildSecretToNamespaceMap: mockBuildSecretToNamespaceMap,
    createSealedSecretManifest: mockCreateSealedSecretManifest,
    createUserSealedSecretManifests: mockCreateUserSealedSecretManifests,
    writeSealedSecretManifests: mockWriteSealedSecretManifests,
    applySealedSecretManifestsFromDir: mockApplySealedSecretManifestsFromDir,
    restartSealedSecretsController: mockRestartSealedSecretsController,
    getK8sSecret: mockGetK8sSecret,
    getSchemaSecretsPaths: mockGetSchemaSecretsPaths,
    removeSopsArtifacts: mockRemoveSopsArtifacts,
    setGitConfig: mockSetGitConfig,
    getOldGitCredentials: mockGetOldGitConfig,
    ensureNamespaceExists: mockEnsureNamespaceExists,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should skip when no .sops.yaml exists and no manifests on disk', async () => {
    mockExistsSync.mockReturnValue(false)
    mockGlobSync.mockReturnValue([])

    await sopsMigration({ teamConfig: {}, versions: { specVersion: 55 } }, makeDeps())

    expect(mockBuildSecretToNamespaceMap).not.toHaveBeenCalled()
    expect(mockApplySealedSecretManifestsFromDir).not.toHaveBeenCalled()
    expect(mockRestartSealedSecretsController).not.toHaveBeenCalled()
    expect(mockRemoveSopsArtifacts).not.toHaveBeenCalled()
  })

  it('should re-apply and restart controller when manifests exist but K8s Secrets are missing', async () => {
    mockExistsSync.mockReturnValue(false)
    mockGlobSync.mockReturnValue(['/env/manifests/namespaces/apl-secrets/sealedsecrets/otomi-secrets.yaml'])
    mockGetK8sSecret.mockResolvedValue(undefined) // Secret doesn't exist yet

    await sopsMigration({ teamConfig: {}, versions: { specVersion: 55 } }, makeDeps())

    expect(mockApplySealedSecretManifestsFromDir).toHaveBeenCalledWith(env.ENV_DIR)
    expect(mockRestartSealedSecretsController).toHaveBeenCalled()
    expect(mockBuildSecretToNamespaceMap).not.toHaveBeenCalled()
  })

  it('should skip re-apply when manifests exist and K8s Secrets already exist', async () => {
    mockExistsSync.mockReturnValue(false)
    mockGlobSync.mockReturnValue(['/env/manifests/namespaces/apl-secrets/sealedsecrets/otomi-secrets.yaml'])
    mockGetK8sSecret.mockResolvedValue({ adminPassword: 'somepassword' }) // Secret exists

    await sopsMigration({ teamConfig: {}, versions: { specVersion: 55 } }, makeDeps())

    expect(mockApplySealedSecretManifestsFromDir).not.toHaveBeenCalled()
    expect(mockRestartSealedSecretsController).not.toHaveBeenCalled()
    expect(mockBuildSecretToNamespaceMap).not.toHaveBeenCalled()
  })

  it('should run full migration path', async () => {
    mockExistsSync.mockReturnValue(true)
    mockGlobSync.mockReturnValue([])
    mockGetExistingSealedSecretsCert.mockResolvedValue(undefined)
    mockGenerateSealedSecretsKeyPair.mockReturnValue({ certificate: 'cert-pem', privateKey: 'key-pem' })
    mockCreateSealedSecretsKeySecret.mockResolvedValue(undefined)
    mockGetPemFromCertificate.mockReturnValue('spki-pem')
    mockBuildSecretToNamespaceMap.mockResolvedValue([
      { namespace: 'apl-secrets', secretName: 'gitea-secrets', data: { adminPassword: 'pass' } },
    ])
    mockCreateSealedSecretManifest.mockResolvedValue({
      apiVersion: 'bitnami.com/v1alpha1',
      kind: 'SealedSecret',
      metadata: { name: 'gitea-secrets', namespace: 'apl-secrets', annotations: {} },
      spec: { encryptedData: { adminPassword: 'encrypted' }, template: {} },
    })
    mockCreateUserSealedSecretManifests.mockResolvedValue([])
    mockWriteSealedSecretManifests.mockResolvedValue(undefined)
    mockGetSchemaSecretsPaths.mockResolvedValue(['apps.gitea.adminPassword'])

    const values = {
      teamConfig: {},
      versions: { specVersion: 55 },
      apps: { gitea: { adminPassword: 'pass' } },
    }

    await sopsMigration(values, makeDeps())

    expect(mockGetOldGitConfig).toHaveBeenCalled()
    expect(mockEnsureNamespaceExists).toHaveBeenCalled()
    expect(mockSetGitConfig).toHaveBeenCalledWith({ username: 'otomi-admin', password: 'otomi-password' })
    expect(mockGenerateSealedSecretsKeyPair).toHaveBeenCalled()
    expect(mockCreateSealedSecretsKeySecret).toHaveBeenCalledWith('cert-pem', 'key-pem')
    expect(mockBuildSecretToNamespaceMap).toHaveBeenCalled()
    expect(mockCreateSealedSecretManifest).toHaveBeenCalledWith('spki-pem', expect.any(Object))
    expect(mockWriteSealedSecretManifests).toHaveBeenCalled()
    expect(mockApplySealedSecretManifestsFromDir).toHaveBeenCalledWith(env.ENV_DIR)
    expect(mockRestartSealedSecretsController).toHaveBeenCalled()
    expect(mockGetSchemaSecretsPaths).toHaveBeenCalled()
    expect(mockRemoveSopsArtifacts).toHaveBeenCalled()
    // Secrets should be stripped from values (in-place mutation)
    expect(values.apps.gitea.adminPassword).toBeUndefined()
  })

  it('should use existing certificate when available', async () => {
    mockExistsSync.mockReturnValue(true)
    mockGlobSync.mockReturnValue([])
    mockGetExistingSealedSecretsCert.mockResolvedValue('existing-cert-pem')
    mockGetPemFromCertificate.mockReturnValue('existing-spki-pem')
    mockBuildSecretToNamespaceMap.mockResolvedValue([])
    mockWriteSealedSecretManifests.mockResolvedValue(undefined)
    mockGetSchemaSecretsPaths.mockResolvedValue([])

    await sopsMigration({ teamConfig: {}, versions: { specVersion: 55 } }, makeDeps())

    expect(mockGenerateSealedSecretsKeyPair).not.toHaveBeenCalled()
    expect(mockCreateSealedSecretsKeySecret).not.toHaveBeenCalled()
    expect(mockGetPemFromCertificate).toHaveBeenCalledWith('existing-cert-pem')
  })

  it('should handle users', async () => {
    mockExistsSync.mockReturnValue(true)
    mockGlobSync.mockReturnValue([])
    mockGetExistingSealedSecretsCert.mockResolvedValue('cert')
    mockGetPemFromCertificate.mockReturnValue('pem')
    mockBuildSecretToNamespaceMap.mockResolvedValue([])
    mockCreateUserSealedSecretManifests.mockResolvedValue([
      {
        apiVersion: 'bitnami.com/v1alpha1',
        kind: 'SealedSecret',
        metadata: { name: 'user1', namespace: 'apl-users' },
      },
    ])
    mockWriteSealedSecretManifests.mockResolvedValue(undefined)
    mockGetSchemaSecretsPaths.mockResolvedValue([])

    const values = {
      teamConfig: {},
      versions: { specVersion: 55 },
      users: [{ name: 'user1', email: 'user1@example.com' }],
    }

    await sopsMigration(values, makeDeps())

    expect(mockCreateUserSealedSecretManifests).toHaveBeenCalledWith(
      [{ name: 'user1', email: 'user1@example.com' }],
      'pem',
    )
  })

  it('should handle empty secrets gracefully', async () => {
    mockExistsSync.mockReturnValue(true)
    mockGlobSync.mockReturnValue([])
    mockGetExistingSealedSecretsCert.mockResolvedValue('cert')
    mockGetPemFromCertificate.mockReturnValue('pem')
    mockBuildSecretToNamespaceMap.mockResolvedValue([])
    mockWriteSealedSecretManifests.mockResolvedValue(undefined)
    mockGetSchemaSecretsPaths.mockResolvedValue([])

    await sopsMigration({ teamConfig: {}, versions: { specVersion: 55 } }, makeDeps())

    expect(mockCreateSealedSecretManifest).not.toHaveBeenCalled()
    expect(mockWriteSealedSecretManifests).toHaveBeenCalledWith([], env.ENV_DIR)
    expect(mockRemoveSopsArtifacts).toHaveBeenCalled()
  })
})

describe('removeSopsArtifacts', () => {
  it('should remove .sops.yaml, secrets files, and user files', () => {
    const mockExistsSync = jest.fn().mockReturnValue(true)
    const mockRmSync = jest.fn()
    const mockGlobSync = jest
      .fn()
      .mockReturnValueOnce([`${env.ENV_DIR}/env/apps/secrets.gitea.yaml`])
      .mockReturnValueOnce([`${env.ENV_DIR}/env/apps/secrets.gitea.yaml.dec`])
      .mockReturnValueOnce([`${env.ENV_DIR}/env/users/some-uuid.yaml`])

    removeSopsArtifacts({
      existsSync: mockExistsSync,
      rmSync: mockRmSync,
      globSync: mockGlobSync,
      terminal,
    })

    expect(mockRmSync).toHaveBeenCalledWith(`${env.ENV_DIR}/.sops.yaml`)
    expect(mockRmSync).toHaveBeenCalledWith(`${env.ENV_DIR}/env/apps/secrets.gitea.yaml`)
    expect(mockRmSync).toHaveBeenCalledWith(`${env.ENV_DIR}/env/apps/secrets.gitea.yaml.dec`)
    expect(mockRmSync).toHaveBeenCalledWith(`${env.ENV_DIR}/env/users/some-uuid.yaml`)
  })

  it('should skip .sops.yaml removal when it does not exist', () => {
    const mockExistsSync = jest.fn().mockReturnValue(false)
    const mockRmSync = jest.fn()
    const mockGlobSync = jest.fn().mockReturnValue([])

    removeSopsArtifacts({
      existsSync: mockExistsSync,
      rmSync: mockRmSync,
      globSync: mockGlobSync,
      terminal,
    })

    expect(mockRmSync).not.toHaveBeenCalledWith(`${env.ENV_DIR}/.sops.yaml`)
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
    expect(mockDeleteFile).toHaveBeenCalledWith('env/apps/secrets.myApp.yaml')
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
  const makeDeps = (overrides: Partial<any> = {}) => ({
    readPvc: jest.fn(async () => undefined),
    listPvcs: jest.fn(async () => []),
    getParsedArgs: jest.fn(() => ({ dryRun: false, local: false })),
    terminal,
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

    expect(values.apps['git-server']._rawValues.persistence.storageClass).toBe('legacy-sc')
    expect(values.apps.gitea._rawValues.global.storageClass).toBe('legacy-sc')
    expect(values.apps.gitea._rawValues.giteaBackup.storageClassName).toBe('legacy-sc')
    expect(values.databases.gitea.storageClass).toBe('legacy-sc')
    expect(values.apps.harbor._rawValues.persistence.persistentVolumeClaim.redis.storageClass).toBe('legacy-sc')
    expect(values.apps.harbor._rawValues.persistence.persistentVolumeClaim.trivy.storageClass).toBe('legacy-sc')
    expect(values.databases.harbor.storageClass).toBe('legacy-sc')
    expect(values.databases.keycloak.storageClass).toBe('legacy-sc')
    expect(values.apps['kubeflow-pipelines']._rawValues.mysql.storage.storageClass).toBe('legacy-sc')
    expect(
      values.apps.prometheus._rawValues.prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.storageClassName,
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
