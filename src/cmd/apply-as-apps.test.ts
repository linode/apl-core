import { statSync } from 'fs'
import { glob } from 'glob'
import { ARGOCD_APP_PARAMS } from '../common/constants'
import { env } from '../common/envalid'
import { getNames } from '../common/utils'
import {
  addGitOpsApps,
  applyArgocdApp,
  applyGitOpsApps,
  ArgocdAppManifest,
  calculateGitOpsAppsSyncState,
  checkArgoCdController,
  getApplications,
  getArgocdCoreAppManifest,
  getArgocdGitopsManifest,
  mergeSyncOptions,
  removeGitOpsApps,
  stripOversizedLastAppliedAnnotations,
} from './apply-as-apps'

jest.mock('glob')
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  statSync: jest.fn(),
  existsSync: jest.fn(),
}))
jest.mock('../common/envalid')
jest.mock('../common/git-config', () => ({
  getStoredGitRepoConfig: jest.fn().mockResolvedValue({ repoUrl: 'https://git.example.com/otomi/values.git' }),
}))
jest.mock('../common/debug', () => ({
  ...jest.requireActual('../common/debug'),
  terminal: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    stream: { log: process.stdout, error: process.stderr },
  })),
}))

const mockGlob = glob as jest.MockedFunction<typeof glob>
const mockStatSync = statSync as jest.MockedFunction<any>
const mockGetApplications = jest.fn() as jest.MockedFunction<typeof getApplications>
const mockApplyArgoCdApp = jest.fn() as jest.MockedFunction<typeof applyArgocdApp>
const mockCalculateGitOpsAppsSyncState = jest.fn() as jest.MockedFunction<typeof calculateGitOpsAppsSyncState>
const mockAddGitOpsApps = jest.fn() as jest.MockedFunction<typeof addGitOpsApps>
const mockRemoveGitOpsApps = jest.fn() as jest.MockedFunction<typeof removeGitOpsApps>
const mockGetArgocdGitopsManifest = jest.fn() as jest.MockedFunction<typeof getArgocdGitopsManifest>

const mockPatchNamespacedCustomObject = jest.fn()
const mockDeleteNamespacedCustomObject = jest.fn()
const mockListNamespacedCustomObject = jest.fn()
const mockRestartStatefulSet = jest.fn()
const mockArgoCdHasUnrecoverableErrors = jest.fn()
const mockPatchContainerResourcesOfSts = jest.fn()
const mockLoadYaml = jest.fn()

const ARGOCD_BASE_MANIFEST: ArgocdAppManifest = {
  apiVersion: 'argoproj.io/v1alpha1',
  kind: 'Application',
  metadata: {
    name: '',
    namespace: '',
  },
  spec: {},
}

jest.mock('../common/k8s', () => ({
  k8s: {
    custom: () => ({
      patchNamespacedCustomObject: (...args: any[]) => mockPatchNamespacedCustomObject(...args),
      deleteNamespacedCustomObject: (...args: any[]) => mockDeleteNamespacedCustomObject(...args),
      listNamespacedCustomObject: (...args: any[]) => mockListNamespacedCustomObject(...args),
    }),
    app: () => ({}),
    core: () => ({}),
  },
  argoCdHasUnrecoverableErrors: (...args: any[]) => mockArgoCdHasUnrecoverableErrors(...args),
  restartStatefulSet: (...args: any[]) => mockRestartStatefulSet(...args),
  patchContainerResourcesOfSts: (...args: any[]) => mockPatchContainerResourcesOfSts(...args),
}))

jest.mock('../common/utils', () => ({
  ...jest.requireActual('../common/utils'),
  loadYaml: (...args: any[]) => mockLoadYaml(...args),
}))

describe('getArgocdGitopsManifest', () => {
  const repoURL = 'https://git.example.com/otomi/values.git'
  const branch = 'main'

  it('should create manifest with correct structure for global deployment', () => {
    const name = 'my-app'
    const manifest = getArgocdGitopsManifest(name, repoURL, branch)

    expect(manifest).toEqual({
      ...ARGOCD_BASE_MANIFEST,
      metadata: {
        name: 'my-app',
        namespace: 'argocd',
        labels: {
          'otomi.io/app': 'generic-gitops',
        },
        annotations: {
          'argocd.argoproj.io/compare-options': 'ServerSideDiff=true,IncludeMutationWebhook=true',
        },
        finalizers: ['resources-finalizer.argocd.argoproj.io'],
      },
      spec: {
        project: 'default',
        syncPolicy: {
          automated: {
            selfHeal: true,
            prune: false,
          },
          syncOptions: ['ServerSideApply=true', 'RespectIgnoreDifferences=true'],
        },
        sources: [
          {
            path: 'env/manifests/global',
            repoURL,
            targetRevision: branch,
            directory: {
              recurse: true,
            },
          },
        ],
        destination: {
          server: 'https://kubernetes.default.svc',
          namespace: undefined,
        },
      },
    })
  })

  it('should create manifest with correct structure for namespaced deployment', () => {
    const name = 'my-app'
    const targetNamespace = 'my-namespace'
    const manifest = getArgocdGitopsManifest(name, repoURL, branch, targetNamespace)

    expect(manifest).toEqual({
      ...ARGOCD_BASE_MANIFEST,
      metadata: {
        name: 'my-app',
        namespace: 'argocd',
        labels: {
          'otomi.io/app': 'generic-gitops',
        },
        annotations: {
          'argocd.argoproj.io/compare-options': 'ServerSideDiff=true,IncludeMutationWebhook=true',
        },
        finalizers: ['resources-finalizer.argocd.argoproj.io'],
      },
      spec: {
        project: 'default',
        syncPolicy: {
          automated: {
            selfHeal: true,
            prune: true,
          },
          syncOptions: ['ServerSideApply=true', 'RespectIgnoreDifferences=true', 'CreateNamespace=true'],
        },
        sources: [
          {
            path: 'env/manifests/namespaces/my-namespace',
            repoURL,
            targetRevision: branch,
            directory: {
              recurse: true,
            },
          },
        ],
        destination: {
          server: 'https://kubernetes.default.svc',
          namespace: 'my-namespace',
        },
      },
    })
  })
})

describe('applyArgoCdApp', () => {
  const mockManifest: ArgocdAppManifest = {
    ...ARGOCD_BASE_MANIFEST,
    metadata: {
      name: 'test-app',
      namespace: 'argocd',
    },
    spec: {
      project: 'default',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should server-side apply applications', async () => {
    mockPatchNamespacedCustomObject.mockResolvedValue({})

    await applyArgocdApp(mockManifest)

    expect(mockPatchNamespacedCustomObject).toHaveBeenCalledTimes(1)
    expect(mockPatchNamespacedCustomObject).toHaveBeenCalledWith(
      {
        ...ARGOCD_APP_PARAMS,
        name: 'test-app',
        body: mockManifest,
        fieldManager: 'apl-operator',
        force: true,
      },
      {
        middleware: expect.any(Array),
        middlewareMergeStrategy: 'append',
      },
    )
  })

  it('should throw non-ApiException errors', async () => {
    const genericError = new Error('Network error')
    mockPatchNamespacedCustomObject.mockRejectedValue(genericError)

    await expect(applyArgocdApp(mockManifest)).rejects.toThrow('Network error')
  })
})

describe('getApplications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return list of application names with default label selector', async () => {
    const mockApps = {
      items: [{ metadata: { name: 'app1' } }, { metadata: { name: 'app2' } }, { metadata: { name: 'app3' } }],
    }
    mockListNamespacedCustomObject.mockResolvedValue(mockApps)

    const result = getNames(await getApplications())

    expect(mockListNamespacedCustomObject).toHaveBeenCalledWith({
      ...ARGOCD_APP_PARAMS,
      labelSelector: 'otomi.io/app=managed',
    })
    expect(result).toEqual(['app1', 'app2', 'app3'])
  })

  it('should return list of application names with custom label selector', async () => {
    const mockApps = {
      items: [{ metadata: { name: 'gitops-app1' } }, { metadata: { name: 'gitops-app2' } }],
    }
    mockListNamespacedCustomObject.mockResolvedValue(mockApps)

    const result = getNames(await getApplications('otomi.io/app=generic-gitops'))

    expect(mockListNamespacedCustomObject).toHaveBeenCalledWith({
      ...ARGOCD_APP_PARAMS,
      labelSelector: 'otomi.io/app=generic-gitops',
    })
    expect(result).toEqual(['gitops-app1', 'gitops-app2'])
  })

  it('should filter out apps without names', async () => {
    const mockApps = {
      items: [
        { metadata: { name: 'app1' } },
        { metadata: { name: '' } },
        { metadata: {} },
        { metadata: { name: 'app2' } },
      ],
    }
    mockListNamespacedCustomObject.mockResolvedValue(mockApps)

    const result = getNames(await getApplications())

    expect(result).toEqual(['app1', 'app2'])
  })

  it('should return empty array on error', async () => {
    mockListNamespacedCustomObject.mockRejectedValue(new Error('API error'))

    const result = getNames(await getApplications())

    expect(result).toEqual([])
  })
})

describe('calculateGitOpsAppsSyncState', () => {
  const mockEnvDir = '/test'
  const mockDeps = {
    getApplications: mockGetApplications,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(env as any).ENV_DIR = mockEnvDir
  })

  const setupMockDirs = (dirNames: string[], nonDirItems: string[] = []) => {
    const mockPaths = [
      ...dirNames.map((name) => ({ name, isDirectory: () => true }) as any),
      ...nonDirItems.map((name) => ({ name, isDirectory: () => false }) as any),
    ]
    mockGlob.mockResolvedValue(mockPaths)
  }

  it('should return required and stale apps when directories exist', async () => {
    setupMockDirs(['a', 'b', 'c'])
    mockGetApplications.mockResolvedValue([
      {
        ...ARGOCD_BASE_MANIFEST,
        metadata: {
          name: 'gitops-ns-c',
          namespace: '',
        },
      },
    ])
    mockStatSync.mockReturnValue({ isDirectory: () => true })

    const result = await calculateGitOpsAppsSyncState(mockDeps)

    expect(result.requiredGitOpsApps).toEqual(new Set(['gitops-global', 'gitops-ns-a', 'gitops-ns-b', 'gitops-ns-c']))
    expect(result.toRemove).toEqual(new Set())
    expect(result.namespaceDirs).toEqual(['a', 'b', 'c'])
  })

  it('should identify apps to remove when apps exist but directories do not', async () => {
    mockGetApplications.mockResolvedValue([
      {
        ...ARGOCD_BASE_MANIFEST,
        metadata: {
          name: 'gitops-ns-a',
          namespace: '',
        },
      },
      {
        ...ARGOCD_BASE_MANIFEST,
        metadata: {
          name: 'gitops-ns-b',
          namespace: '',
        },
      },
      {
        ...ARGOCD_BASE_MANIFEST,
        metadata: {
          name: 'gitops-ns-c',
          namespace: '',
        },
      },
    ])
    setupMockDirs(['a'])
    mockStatSync.mockReturnValue(undefined)

    const result = await calculateGitOpsAppsSyncState(mockDeps)

    expect(result.requiredGitOpsApps).toEqual(new Set(['gitops-ns-a']))
    expect(result.toRemove).toEqual(new Set(['gitops-ns-b', 'gitops-ns-c']))
    expect(result.namespaceDirs).toEqual(['a'])
  })

  it('should include global app when global directory exists', async () => {
    mockGetApplications.mockResolvedValue([])
    setupMockDirs([])
    mockStatSync.mockReturnValue({ isDirectory: () => true })

    const result = await calculateGitOpsAppsSyncState(mockDeps)

    expect(result.requiredGitOpsApps).toEqual(new Set(['gitops-global']))
  })

  it('should not remove global app even if directory does not exist', async () => {
    mockGetApplications.mockResolvedValue([
      {
        ...ARGOCD_BASE_MANIFEST,
        metadata: {
          name: 'gitops-global',
          namespace: '',
        },
      },
      {
        ...ARGOCD_BASE_MANIFEST,
        metadata: {
          name: 'gitops-ns-a',
          namespace: '',
        },
      },
    ])
    setupMockDirs([])
    mockStatSync.mockReturnValue(undefined)

    const result = await calculateGitOpsAppsSyncState(mockDeps)

    expect(result.toRemove).toEqual(new Set(['gitops-ns-a']))
  })

  it('should filter out non-directory entries from glob results', async () => {
    mockGetApplications.mockResolvedValue([])
    setupMockDirs(['a', 'b'], ['file.txt', 'README.md'])
    mockStatSync.mockReturnValue(undefined)

    const result = await calculateGitOpsAppsSyncState(mockDeps)

    expect(result.namespaceDirs).toEqual(['a', 'b'])
    expect(result.requiredGitOpsApps).toEqual(new Set(['gitops-ns-a', 'gitops-ns-b']))
  })

  it('should handle no changes scenario', async () => {
    mockGetApplications.mockResolvedValue([
      {
        ...ARGOCD_BASE_MANIFEST,
        metadata: {
          name: 'gitops-global',
          namespace: '',
        },
      },
      {
        ...ARGOCD_BASE_MANIFEST,
        metadata: {
          name: 'gitops-ns-a',
          namespace: '',
        },
      },
      {
        ...ARGOCD_BASE_MANIFEST,
        metadata: {
          name: 'gitops-ns-b',
          namespace: '',
        },
      },
    ])
    setupMockDirs(['a', 'b'])
    mockStatSync.mockReturnValue({ isDirectory: () => true })

    const result = await calculateGitOpsAppsSyncState({ getApplications: mockGetApplications })

    expect(result.toRemove).toEqual(new Set())
    expect(result.requiredGitOpsApps).toEqual(new Set(['gitops-global', 'gitops-ns-a', 'gitops-ns-b']))
  })
})

describe('applyGitOpsApps', () => {
  const mockDeps = {
    calculateGitOpsAppsSyncState: mockCalculateGitOpsAppsSyncState,
    addGitOpsApps: mockAddGitOpsApps,
    removeGitOpsApps: mockRemoveGitOpsApps,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should apply all required apps', async () => {
    const requiredGitOpsApps = new Set(['gitops-global', 'gitops-ns-a'])
    const toRemove = new Set<string>()
    const namespaceDirs = ['a']

    mockCalculateGitOpsAppsSyncState.mockResolvedValue({ toRemove, namespaceDirs, requiredGitOpsApps })

    await applyGitOpsApps(mockDeps)

    expect(mockAddGitOpsApps).toHaveBeenCalledWith(requiredGitOpsApps, namespaceDirs)
    expect(mockRemoveGitOpsApps).not.toHaveBeenCalled()
  })

  it('should remove stale apps and still reconcile required apps', async () => {
    const requiredGitOpsApps = new Set(['gitops-ns-a'])
    const toRemove = new Set(['gitops-ns-b', 'gitops-ns-c'])
    const namespaceDirs = ['a']

    mockCalculateGitOpsAppsSyncState.mockResolvedValue({ toRemove, namespaceDirs, requiredGitOpsApps })

    await applyGitOpsApps(mockDeps)

    expect(mockAddGitOpsApps).toHaveBeenCalledWith(requiredGitOpsApps, namespaceDirs)
    expect(mockRemoveGitOpsApps).toHaveBeenCalledWith(toRemove)
  })

  it('should apply and remove when both are needed', async () => {
    const requiredGitOpsApps = new Set(['gitops-global', 'gitops-ns-c'])
    const toRemove = new Set(['gitops-ns-a', 'gitops-ns-b'])
    const namespaceDirs = ['c', 'd']

    mockCalculateGitOpsAppsSyncState.mockResolvedValue({ toRemove, namespaceDirs, requiredGitOpsApps })

    await applyGitOpsApps(mockDeps)

    expect(mockAddGitOpsApps).toHaveBeenCalledWith(requiredGitOpsApps, namespaceDirs)
    expect(mockRemoveGitOpsApps).toHaveBeenCalledWith(toRemove)
  })

  it('should re-apply existing apps even when nothing has changed', async () => {
    const requiredGitOpsApps = new Set(['gitops-global', 'gitops-ns-a'])
    const toRemove = new Set<string>()
    const namespaceDirs = ['a']

    mockCalculateGitOpsAppsSyncState.mockResolvedValue({ toRemove, namespaceDirs, requiredGitOpsApps })

    await applyGitOpsApps(mockDeps)

    expect(mockAddGitOpsApps).toHaveBeenCalledWith(requiredGitOpsApps, namespaceDirs)
    expect(mockRemoveGitOpsApps).not.toHaveBeenCalled()
  })
})

describe('addGitOpsApps', () => {
  const repoUrl = 'https://git.example.com/otomi/values.git'
  const branch = 'main'
  const mockGetStoredGitRepoConfig = jest.fn().mockResolvedValue({ repoUrl, branch })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetStoredGitRepoConfig.mockResolvedValue({ repoUrl, branch })
  })
  const mockDeps = {
    getArgocdGitopsManifest: mockGetArgocdGitopsManifest,
    applyArgocdApp: mockApplyArgoCdApp,
    getStoredGitRepoConfig: mockGetStoredGitRepoConfig,
  }

  it('should create global app when included in appNames', async () => {
    const appNames = new Set(['gitops-global', 'gitops-ns-a'])
    const namespaceDirs = ['a']
    const mockManifest = { metadata: { name: 'gitops-global' } } as ArgocdAppManifest

    mockGetArgocdGitopsManifest.mockReturnValue(mockManifest)

    await addGitOpsApps(appNames, namespaceDirs, mockDeps)

    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-global', repoUrl, branch)
    expect(mockApplyArgoCdApp).toHaveBeenCalledWith(mockManifest)
  })

  it('should create namespace apps for each directory in appNames', async () => {
    const appNames = new Set(['gitops-ns-a', 'gitops-ns-b'])
    const namespaceDirs = ['a', 'b', 'c']

    await addGitOpsApps(appNames, namespaceDirs, mockDeps)

    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-a', repoUrl, branch, 'a')
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-b', repoUrl, branch, 'b')
    expect(mockGetArgocdGitopsManifest).not.toHaveBeenCalledWith('gitops-ns-c', repoUrl, branch, 'c')
    expect(mockApplyArgoCdApp).toHaveBeenCalledTimes(2)
  })

  it('should not create global app when not in appNames', async () => {
    const appNames = new Set(['gitops-ns-a'])
    const namespaceDirs = ['a']

    await addGitOpsApps(appNames, namespaceDirs, mockDeps)

    expect(mockGetArgocdGitopsManifest).not.toHaveBeenCalledWith('gitops-global', repoUrl, branch)
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-a', repoUrl, branch, 'a')
  })

  it('should continue processing when app creation fails', async () => {
    const appNames = new Set(['gitops-global', 'gitops-ns-a', 'gitops-ns-b'])
    const namespaceDirs = ['a', 'b']

    mockApplyArgoCdApp
      .mockResolvedValueOnce(undefined) // global succeeds
      .mockRejectedValueOnce(new Error('Failed to create')) // a fails
      .mockResolvedValueOnce(undefined) // b succeeds

    await addGitOpsApps(appNames, namespaceDirs, mockDeps)

    expect(mockApplyArgoCdApp).toHaveBeenCalledTimes(3)
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-global', repoUrl, branch)
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-a', repoUrl, branch, 'a')
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-b', repoUrl, branch, 'b')
  })

  it('should handle empty appNames set', async () => {
    const appNames = new Set<string>()
    const namespaceDirs = ['a', 'b']

    await addGitOpsApps(appNames, namespaceDirs, mockDeps)

    expect(mockGetArgocdGitopsManifest).not.toHaveBeenCalled()
    expect(mockApplyArgoCdApp).not.toHaveBeenCalled()
  })
})

describe('removeGitOpsApps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete all apps in the provided set', async () => {
    await removeGitOpsApps(new Set(['gitops-ns-a', 'gitops-ns-b', 'gitops-ns-c']))

    expect(mockDeleteNamespacedCustomObject).toHaveBeenCalledTimes(3)
    expect(mockDeleteNamespacedCustomObject).toHaveBeenCalledWith({ ...ARGOCD_APP_PARAMS, name: 'gitops-ns-a' })
    expect(mockDeleteNamespacedCustomObject).toHaveBeenCalledWith({ ...ARGOCD_APP_PARAMS, name: 'gitops-ns-b' })
    expect(mockDeleteNamespacedCustomObject).toHaveBeenCalledWith({ ...ARGOCD_APP_PARAMS, name: 'gitops-ns-c' })
  })

  it('should continue processing when deletion fails', async () => {
    const appNames = new Set(['gitops-ns-a', 'gitops-ns-b'])
    mockDeleteNamespacedCustomObject
      .mockRejectedValueOnce(new Error('Failed to delete'))
      .mockResolvedValueOnce(undefined)

    await removeGitOpsApps(appNames)

    expect(mockDeleteNamespacedCustomObject).toHaveBeenCalledTimes(2)
  })

  it('should do nothing when appNames is empty', async () => {
    await removeGitOpsApps(new Set([]))

    expect(mockDeleteNamespacedCustomObject).not.toHaveBeenCalled()
  })
})

describe('checkArgoCdController', () => {
  const argocdRelease = {
    name: 'argocd',
    namespace: 'argocd',
    enabled: true,
    installed: true,
    labels: '',
    chart: 'charts/argocd',
    version: '1.0.0',
  }

  const mockApplications: ArgocdAppManifest[] = [
    { ...ARGOCD_BASE_MANIFEST, metadata: { name: 'argocd-argocd', namespace: 'argocd' } },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should restart the controller when unrecoverable errors are detected', async () => {
    mockArgoCdHasUnrecoverableErrors.mockReturnValue('argocd-argocd')
    mockRestartStatefulSet.mockResolvedValue(undefined)

    await checkArgoCdController(mockApplications, [argocdRelease])

    expect(mockRestartStatefulSet).toHaveBeenCalledWith('argocd-application-controller', 'argocd')
    expect(mockPatchContainerResourcesOfSts).not.toHaveBeenCalled()
  })

  it('should patch argocd resources when no unrecoverable errors are detected', async () => {
    mockArgoCdHasUnrecoverableErrors.mockReturnValue(null)
    mockLoadYaml.mockResolvedValue({
      controller: {
        resources: {
          limits: { cpu: '2', memory: '2Gi' },
          requests: { cpu: '500m', memory: '512Mi' },
        },
      },
    })
    mockPatchContainerResourcesOfSts.mockResolvedValue(undefined)

    await checkArgoCdController(mockApplications, [argocdRelease])

    expect(mockRestartStatefulSet).not.toHaveBeenCalled()
    expect(mockPatchContainerResourcesOfSts).toHaveBeenCalledWith(
      'argocd-application-controller',
      'argocd',
      'application-controller',
      {
        limits: { cpu: '2', memory: '2Gi' },
        requests: { cpu: '500m', memory: '512Mi' },
      },
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })

  it('should not patch resources when the argocd release is not in the releases list', async () => {
    mockArgoCdHasUnrecoverableErrors.mockReturnValue(null)

    await checkArgoCdController(mockApplications, [])

    expect(mockRestartStatefulSet).not.toHaveBeenCalled()
    expect(mockPatchContainerResourcesOfSts).not.toHaveBeenCalled()
  })

  it('should not throw when an internal error occurs', async () => {
    mockArgoCdHasUnrecoverableErrors.mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    await expect(checkArgoCdController(mockApplications, [argocdRelease])).resolves.toBeUndefined()
    expect(mockRestartStatefulSet).not.toHaveBeenCalled()
  })
})

describe('mergeSyncOptions', () => {
  it('returns base options unchanged when patch provides none', () => {
    expect(mergeSyncOptions(['ServerSideApply=true'])).toEqual(['ServerSideApply=true'])
  })

  it('preserves ServerSideApply=true when patch provides only different options', () => {
    const result = mergeSyncOptions(['ServerSideApply=true'], ['CreateNamespace=true'])

    expect(result).toContain('ServerSideApply=true')
    expect(result).toContain('CreateNamespace=true')
  })

  it('deduplicates options that appear in both base and patch', () => {
    const result = mergeSyncOptions(['ServerSideApply=true'], ['ServerSideApply=true', 'CreateNamespace=true'])

    expect(result.filter((o) => o === 'ServerSideApply=true')).toHaveLength(1)
  })
})

describe('getArgocdCoreAppManifest', () => {
  const release = {
    name: 'kyverno',
    namespace: 'kyverno',
    enabled: true,
    installed: true,
    labels: '',
    chart: '../charts/kyverno',
    version: '1.0.0',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(env as any).APPS_REPO_URL = 'https://charts.example.com'
    ;(env as any).APPS_REVISION = undefined
  })

  it('should include ServerSideApply=true in syncOptions', () => {
    const manifest = getArgocdCoreAppManifest(release, {}, '1.0.0')

    expect(manifest.spec.syncPolicy.syncOptions).toContain('ServerSideApply=true')
  })

  it('should preserve ServerSideApply=true when app has a patch with only ignoreDifferences', () => {
    const istioBase = { ...release, name: 'istio-base', namespace: 'istio-system' }
    const manifest = getArgocdCoreAppManifest(istioBase, {}, '1.0.0')

    expect(manifest.spec.syncPolicy.syncOptions).toContain('ServerSideApply=true')
  })
})

describe('stripOversizedLastAppliedAnnotations', () => {
  const annotation = 'kubectl.kubernetes.io/last-applied-configuration'
  const oversizedValue = 'x'.repeat(262145)
  const undersizedValue = 'x'.repeat(100)

  const mockListCRDs = jest.fn()
  const mockPatchCRD = jest.fn()
  const mockListConfigMaps = jest.fn()
  const mockPatchConfigMap = jest.fn()

  const mockDeps = {
    getCrdApi: () => ({ listCustomResourceDefinition: mockListCRDs, patchCustomResourceDefinition: mockPatchCRD }),
    getCoreApi: () => ({
      listConfigMapForAllNamespaces: mockListConfigMaps,
      patchNamespacedConfigMap: mockPatchConfigMap,
    }),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockListCRDs.mockResolvedValue({ items: [] })
    mockListConfigMaps.mockResolvedValue({ items: [] })
    mockPatchCRD.mockResolvedValue({})
    mockPatchConfigMap.mockResolvedValue({})
  })

  it('removes last-applied-configuration from a CRD whose annotation exceeds the limit', async () => {
    mockListCRDs.mockResolvedValue({
      items: [{ metadata: { name: 'clusterpolicies.kyverno.io', annotations: { [annotation]: oversizedValue } } }],
    })

    await stripOversizedLastAppliedAnnotations(mockDeps as any)

    expect(mockPatchCRD).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'clusterpolicies.kyverno.io' }),
      expect.anything(),
    )
  })

  it('removes last-applied-configuration from a ConfigMap whose annotation exceeds the limit', async () => {
    mockListConfigMaps.mockResolvedValue({
      items: [
        {
          metadata: {
            name: 'grafana-dashboards-k8s-admin',
            namespace: 'grafana',
            annotations: { [annotation]: oversizedValue },
          },
        },
      ],
    })

    await stripOversizedLastAppliedAnnotations(mockDeps as any)

    expect(mockPatchConfigMap).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'grafana-dashboards-k8s-admin', namespace: 'grafana' }),
      expect.anything(),
    )
  })

  it('does not patch a ConfigMap without the annotation', async () => {
    mockListConfigMaps.mockResolvedValue({
      items: [{ metadata: { name: 'some-config', namespace: 'default', annotations: {} } }],
    })

    await stripOversizedLastAppliedAnnotations(mockDeps as any)

    expect(mockPatchConfigMap).not.toHaveBeenCalled()
  })
})
