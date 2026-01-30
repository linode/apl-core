import {
  applyGitOpsApps,
  getApplications,
  applyArgocdApp,
  addGitOpsApps,
  removeGitOpsApps,
  calculateGitOpsAppsDiff,
  getArgocdGitopsManifest,
  ArgocdAppManifest,
} from './apply-as-apps'
import { glob } from 'glob'
import { env } from '../common/envalid'
import { statSync } from 'fs'
import { ARGOCD_APP_PARAMS } from '../common/constants'

jest.mock('glob')
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  rmSync: jest.fn(),
  statSync: jest.fn(),
  existsSync: jest.fn(),
}))
jest.mock('../common/envalid')
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
const mockCalculateGitOpsAppsDiff = jest.fn() as jest.MockedFunction<typeof calculateGitOpsAppsDiff>
const mockAddGitOpsApps = jest.fn() as jest.MockedFunction<typeof addGitOpsApps>
const mockRemoveGitOpsApps = jest.fn() as jest.MockedFunction<typeof removeGitOpsApps>
const mockGetArgocdGitopsManifest = jest.fn() as jest.MockedFunction<typeof getArgocdGitopsManifest>

const mockPatchNamespacedCustomObject = jest.fn()
const mockDeleteNamespacedCustomObject = jest.fn()
const mockListNamespacedCustomObject = jest.fn()

jest.mock('../common/k8s', () => ({
  k8s: {
    custom: () => ({
      patchNamespacedCustomObject: (...args: any[]) => mockPatchNamespacedCustomObject(...args),
      deleteNamespacedCustomObject: (...args: any[]) => mockDeleteNamespacedCustomObject(...args),
      listNamespacedCustomObject: (...args: any[]) => mockListNamespacedCustomObject(...args),
    }),
  },
}))

describe('getArgocdGitopsManifest', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(env as any) = {
      GIT_PROTOCOL: 'https',
      GIT_URL: 'git.example.com',
      GIT_PORT: '443',
    }
  })

  it('should create manifest with correct structure for global deployment', () => {
    const name = 'my-app'
    const manifest = getArgocdGitopsManifest(name)

    expect(manifest).toEqual({
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
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
            repoURL: 'https://git.example.com:443/otomi/values.git',
            targetRevision: 'HEAD',
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
    const manifest = getArgocdGitopsManifest(name, targetNamespace)

    expect(manifest).toEqual({
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Application',
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
            path: 'env/manifests/ns/my-namespace',
            repoURL: 'https://git.example.com:443/otomi/values.git',
            targetRevision: 'HEAD',
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
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
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

    const result = await getApplications()

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

    const result = await getApplications('otomi.io/app=generic-gitops')

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

    const result = await getApplications()

    expect(result).toEqual(['app1', 'app2'])
  })

  it('should return empty array on error', async () => {
    mockListNamespacedCustomObject.mockRejectedValue(new Error('API error'))

    const result = await getApplications()

    expect(result).toEqual([])
  })
})

describe('calculateGitOpsAppsDiff', () => {
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

  it('should identify apps to add when directories exist but apps do not', async () => {
    setupMockDirs(['a', 'b', 'c'])
    mockGetApplications.mockResolvedValue(['gitops-ns-c'])
    mockStatSync.mockReturnValue({ isDirectory: () => true })

    const result = await calculateGitOpsAppsDiff(mockDeps)

    expect(result.toAdd).toEqual(new Set(['gitops-global', 'gitops-ns-a', 'gitops-ns-b']))
    expect(result.toRemove).toEqual(new Set())
    expect(result.namespaceDirs).toEqual(['a', 'b', 'c'])
  })

  it('should identify apps to remove when apps exist but directories do not', async () => {
    mockGetApplications.mockResolvedValue(['gitops-ns-a', 'gitops-ns-b', 'gitops-ns-c'])
    setupMockDirs(['a'])
    mockStatSync.mockReturnValue(undefined)

    const result = await calculateGitOpsAppsDiff(mockDeps)

    expect(result.toAdd).toEqual(new Set())
    expect(result.toRemove).toEqual(new Set(['gitops-ns-b', 'gitops-ns-c']))
    expect(result.namespaceDirs).toEqual(['a'])
  })

  it('should include global app when global directory exists', async () => {
    mockGetApplications.mockResolvedValue([])
    setupMockDirs([])
    mockStatSync.mockReturnValue({ isDirectory: () => true })

    const result = await calculateGitOpsAppsDiff(mockDeps)

    expect(result.toAdd).toEqual(new Set(['gitops-global']))
  })

  it('should not remove global app even if directory does not exist', async () => {
    mockGetApplications.mockResolvedValue(['gitops-global', 'gitops-ns-a'])
    setupMockDirs([])
    mockStatSync.mockReturnValue(undefined)

    const result = await calculateGitOpsAppsDiff(mockDeps)

    expect(result.toRemove).toEqual(new Set(['gitops-ns-a']))
  })

  it('should filter out non-directory entries from glob results', async () => {
    mockGetApplications.mockResolvedValue([])
    setupMockDirs(['a', 'b'], ['file.txt', 'README.md'])
    mockStatSync.mockReturnValue(undefined)

    const result = await calculateGitOpsAppsDiff(mockDeps)

    expect(result.namespaceDirs).toEqual(['a', 'b'])
    expect(result.toAdd).toEqual(new Set(['gitops-ns-a', 'gitops-ns-b']))
  })

  it('should handle no changes scenario', async () => {
    mockGetApplications.mockResolvedValue(['gitops-global', 'gitops-ns-a', 'gitops-ns-b'])
    setupMockDirs(['a', 'b'])
    mockStatSync.mockReturnValue({ isDirectory: () => true })

    const result = await calculateGitOpsAppsDiff({ getApplications: mockGetApplications })

    expect(result.toAdd).toEqual(new Set())
    expect(result.toRemove).toEqual(new Set())
  })
})

describe('applyGitOpsApps', () => {
  const mockDeps = {
    calculateGitOpsAppsDiff: mockCalculateGitOpsAppsDiff,
    addGitOpsApps: mockAddGitOpsApps,
    removeGitOpsApps: mockRemoveGitOpsApps,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should add apps when calculateGitOpsAppsDiff returns apps to add', async () => {
    const toAdd = new Set(['gitops-global', 'gitops-ns-a'])
    const toRemove = new Set<string>()
    const namespaceDirs = ['a']

    mockCalculateGitOpsAppsDiff.mockResolvedValue({ toAdd, toRemove, namespaceDirs })

    await applyGitOpsApps(mockDeps)

    expect(mockAddGitOpsApps).toHaveBeenCalledWith(toAdd, namespaceDirs)
    expect(mockRemoveGitOpsApps).not.toHaveBeenCalled()
  })

  it('should remove apps when calculateGitOpsAppsDiff returns apps to remove', async () => {
    const toAdd = new Set<string>()
    const toRemove = new Set(['gitops-ns-b', 'gitops-ns-c'])
    const namespaceDirs = ['a']

    mockCalculateGitOpsAppsDiff.mockResolvedValue({ toAdd, toRemove, namespaceDirs })

    await applyGitOpsApps(mockDeps)

    expect(mockAddGitOpsApps).not.toHaveBeenCalled()
    expect(mockRemoveGitOpsApps).toHaveBeenCalledWith(toRemove)
  })

  it('should both add and remove apps when necessary', async () => {
    const toAdd = new Set(['gitops-global', 'gitops-ns-c'])
    const toRemove = new Set(['gitops-ns-a', 'gitops-ns-b'])
    const namespaceDirs = ['c', 'd']

    mockCalculateGitOpsAppsDiff.mockResolvedValue({ toAdd, toRemove, namespaceDirs })

    await applyGitOpsApps(mockDeps)

    expect(mockAddGitOpsApps).toHaveBeenCalledWith(toAdd, namespaceDirs)
    expect(mockRemoveGitOpsApps).toHaveBeenCalledWith(toRemove)
  })

  it('should do nothing when there are no changes', async () => {
    const toAdd = new Set<string>()
    const toRemove = new Set<string>()
    const namespaceDirs = ['a', 'b']

    mockCalculateGitOpsAppsDiff.mockResolvedValue({ toAdd, toRemove, namespaceDirs })

    await applyGitOpsApps(mockDeps)

    expect(mockAddGitOpsApps).not.toHaveBeenCalled()
    expect(mockRemoveGitOpsApps).not.toHaveBeenCalled()
  })
})

describe('addGitOpsApps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  const mockDeps = {
    getArgocdGitopsManifest: mockGetArgocdGitopsManifest,
    applyArgocdApp: mockApplyArgoCdApp,
  }

  it('should create global app when included in appNames', async () => {
    const appNames = new Set(['gitops-global', 'gitops-ns-a'])
    const namespaceDirs = ['a']
    const mockManifest = { metadata: { name: 'gitops-global' } } as ArgocdAppManifest

    mockGetArgocdGitopsManifest.mockReturnValue(mockManifest)

    await addGitOpsApps(appNames, namespaceDirs, mockDeps)

    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-global')
    expect(mockApplyArgoCdApp).toHaveBeenCalledWith(mockManifest)
  })

  it('should create namespace apps for each directory in appNames', async () => {
    const appNames = new Set(['gitops-ns-a', 'gitops-ns-b'])
    const namespaceDirs = ['a', 'b', 'c']

    await addGitOpsApps(appNames, namespaceDirs, mockDeps)

    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-a', 'a')
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-b', 'b')
    expect(mockGetArgocdGitopsManifest).not.toHaveBeenCalledWith('gitops-ns-c', 'c')
    expect(mockApplyArgoCdApp).toHaveBeenCalledTimes(2)
  })

  it('should not create global app when not in appNames', async () => {
    const appNames = new Set(['gitops-ns-a'])
    const namespaceDirs = ['a']

    await addGitOpsApps(appNames, namespaceDirs, mockDeps)

    expect(mockGetArgocdGitopsManifest).not.toHaveBeenCalledWith('gitops-global')
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-a', 'a')
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
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-global')
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-a', 'a')
    expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-b', 'b')
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
