import {
  applyGitOpsApps,
  getApplications,
  applyArgocdApp,
  removeApplication,
  getArgocdGitopsManifest,
  ArgocdAppManifest,
} from './apply-as-apps'
import { glob } from 'glob'
import { env } from '../common/envalid'
import { statSync } from 'fs'

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
const mockRemoveApplication = jest.fn() as jest.MockedFunction<typeof removeApplication>
const mockGetArgocdGitopsManifest = jest.fn() as jest.MockedFunction<typeof getArgocdGitopsManifest>

const mockPatchNamespacedCustomObject = jest.fn()

jest.mock('../common/k8s', () => ({
  k8s: {
    custom: () => ({
      patchNamespacedCustomObject: (...args: any[]) => mockPatchNamespacedCustomObject(...args),
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
        group: 'argoproj.io',
        version: 'v1alpha1',
        namespace: 'argocd',
        plural: 'applications',
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

describe('applyGitOpsApps', () => {
  const mockEnvDir = '/test'
  const mockDeps = {
    getApplications: mockGetApplications,
    getArgocdGitopsManifest: mockGetArgocdGitopsManifest,
    applyArgocdApp: mockApplyArgoCdApp,
    removeApplication: mockRemoveApplication,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(env as any).ENV_DIR = mockEnvDir
  })

  const setupMockDirs = (dirNames: string[], other: string[] = []) => {
    // Set up return values for the 'glob' function
    const mockPaths = dirNames.map((name) => ({ name, isDirectory: () => true }) as any)
    other.forEach((name) => {
      mockPaths.push({ name, isDirectory: () => false } as any)
    })
    mockGlob.mockResolvedValue(mockPaths)
  }

  describe('when there are namespace directories and global directory exists', () => {
    it('should create gitops apps for new namespaces and global resources', async () => {
      const namespaceDirs = ['a', 'b', 'c']
      setupMockDirs(namespaceDirs)
      mockStatSync.mockReturnValue({ isDirectory: () => true })
      mockGetApplications.mockResolvedValue([])
      mockGetArgocdGitopsManifest.mockReturnValue({ manifest: 'test' } as any)
      mockApplyArgoCdApp.mockResolvedValue(undefined)

      await applyGitOpsApps(mockDeps)

      expect(mockGlob).toHaveBeenCalledWith(`${mockEnvDir}/env/manifests/ns/*`, { withFileTypes: true })
      expect(mockStatSync).toHaveBeenCalledWith(`${mockEnvDir}/env/manifests/global`)
      expect(mockGetApplications).toHaveBeenCalledWith('otomi.io/app=generic-gitops')

      expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-global')
      expect(mockApplyArgoCdApp).toHaveBeenCalledWith({ manifest: 'test' })
      expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-a', 'a')
      expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-b', 'b')
      expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-c', 'c')
      expect(mockApplyArgoCdApp).toHaveBeenCalledTimes(4) // 3 namespaces + 1 global
    })
  })

  describe('when there are existing apps to remove', () => {
    it('should remove apps that no longer have corresponding directories', async () => {
      setupMockDirs(['a'])
      mockStatSync.mockReturnValue(undefined)
      mockGetApplications.mockResolvedValue(['gitops-ns-a', 'gitops-ns-b', 'gitops-ns-c'])
      mockRemoveApplication.mockResolvedValue(undefined)

      await applyGitOpsApps(mockDeps)

      expect(mockRemoveApplication).toHaveBeenCalledWith('gitops-ns-b')
      expect(mockRemoveApplication).toHaveBeenCalledWith('gitops-ns-c')
      expect(mockRemoveApplication).toHaveBeenCalledTimes(2)
    })
  })

  describe('when global app exists but directory does not', () => {
    it('should not remove the global app', async () => {
      setupMockDirs([])
      mockStatSync.mockReturnValue(undefined)
      mockGetApplications.mockResolvedValue(['gitops-global', 'gitops-ns-a'])
      mockRemoveApplication.mockResolvedValue(undefined)

      await applyGitOpsApps(mockDeps)

      expect(mockRemoveApplication).not.toHaveBeenCalledWith('gitops-global')
      expect(mockRemoveApplication).toHaveBeenCalledWith('gitops-ns-a')
      expect(mockRemoveApplication).toHaveBeenCalledTimes(1)
    })
  })

  describe('when no changes are needed', () => {
    it('should not create or remove any apps', async () => {
      setupMockDirs(['a', 'b'])
      mockStatSync.mockReturnValue(undefined)
      mockGetApplications.mockResolvedValue(['gitops-global', 'gitops-ns-a', 'gitops-ns-b'])

      await applyGitOpsApps(mockDeps)

      expect(mockApplyArgoCdApp).not.toHaveBeenCalled()
      expect(mockRemoveApplication).not.toHaveBeenCalled()
    })
  })

  describe('when glob returns non-directory entries', () => {
    it('should filter out non-directory entries', async () => {
      setupMockDirs(['a', 'b'], ['x'])
      mockStatSync.mockReturnValue(undefined)
      mockGetApplications.mockResolvedValue([])
      mockGetArgocdGitopsManifest.mockReturnValue({ manifest: 'test' } as any)
      mockApplyArgoCdApp.mockResolvedValue(undefined)

      await applyGitOpsApps(mockDeps)

      expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-a', 'a')
      expect(mockGetArgocdGitopsManifest).toHaveBeenCalledWith('gitops-ns-b', 'b')
      expect(mockGetArgocdGitopsManifest).not.toHaveBeenCalledWith('gitops-ns-x', 'x')
    })
  })

  describe('when app creation fails', () => {
    it('should continue processing other apps', async () => {
      setupMockDirs(['a', 'b'])
      mockStatSync.mockReturnValue({ isDirectory: () => true })
      mockGetApplications.mockResolvedValue([])
      mockGetArgocdGitopsManifest.mockReturnValue({ manifest: 'test' } as any)
      mockApplyArgoCdApp
        .mockResolvedValueOnce(undefined) // global succeeds
        .mockRejectedValueOnce(new Error('Failed to create')) // a fails
        .mockResolvedValueOnce(undefined) // b succeeds

      await applyGitOpsApps(mockDeps)

      expect(mockApplyArgoCdApp).toHaveBeenCalledTimes(3)
    })
  })

  describe('when app removal fails', () => {
    it('should continue processing other removals', async () => {
      // Arrange
      mockGlob.mockResolvedValue([])
      mockStatSync.mockReturnValue(undefined)
      mockGetApplications.mockResolvedValue(['gitops-ns-a', 'gitops-ns-b'])
      mockRemoveApplication.mockRejectedValueOnce(new Error('Failed to remove')).mockResolvedValueOnce(undefined)

      await applyGitOpsApps(mockDeps)

      expect(mockRemoveApplication).toHaveBeenCalledTimes(2)
    })
  })
})
