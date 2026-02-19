import * as gitConfig from '../common/git-config'
import * as k8s from '../common/k8s'
import { AplOperations } from './apl-operations'
import { Installer } from './installer'

const mockZx = jest.fn().mockReturnValue({
  nothrow: jest.fn().mockReturnValue({
    quiet: jest.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
  }),
})

jest.mock('zx', () => ({
  $: (...args: any[]) => mockZx(...args),
}))

jest.mock('../common/debug', () => ({
  terminal: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

jest.mock('../common/k8s', () => ({
  getK8sConfigMap: jest.fn(),
  getK8sSecret: jest.fn(),
  createUpdateConfigMap: jest.fn(),
  createUpdateGenericSecret: jest.fn(),
  deletePendingHelmReleases: jest.fn().mockResolvedValue(undefined),
  k8s: {
    core: jest.fn(),
  },
}))

jest.mock('../common/git-config', () => ({
  getStoredGitRepoConfig: jest.fn(),
}))

jest.mock('./utils', () => ({
  getErrorMessage: jest.fn((error) => (error instanceof Error ? error.message : String(error))),
}))

describe('Installer', () => {
  let installer: Installer
  let mockAplOps: jest.Mocked<AplOperations>
  let mockCoreApi: any

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()

    // Save original environment variables
    process.env.SOPS_AGE_KEY = ''

    mockCoreApi = {}
    ;(k8s.k8s.core as jest.Mock).mockReturnValue(mockCoreApi)

    mockAplOps = {
      validateCluster: jest.fn().mockResolvedValue(undefined),
      bootstrap: jest.fn().mockResolvedValue(undefined),
      install: jest.fn().mockResolvedValue(undefined),
      migrate: jest.fn().mockResolvedValue(undefined),
      validateValues: jest.fn().mockResolvedValue(undefined),
      apply: jest.fn().mockResolvedValue(undefined),
      applyTeams: jest.fn().mockResolvedValue(undefined),
      applyAsAppsTeams: jest.fn().mockResolvedValue(undefined),
    } as any

    installer = new Installer(mockAplOps)
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('constructor', () => {
    test('should initialize with AplOperations', () => {
      expect(installer).toBeInstanceOf(Installer)
    })
  })

  describe('initialize', () => {
    test('should run validation and bootstrap', async () => {
      await installer.initialize()

      expect(mockAplOps.validateCluster).toHaveBeenCalledTimes(1)
      expect(mockAplOps.bootstrap).toHaveBeenCalledTimes(1)
    })
  })

  describe('reconcileInstall', () => {
    test('should complete fresh installation successfully', async () => {
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      await installer.reconcileInstall()

      expect(mockAplOps.install).toHaveBeenCalledTimes(1)
      expect(k8s.createUpdateConfigMap).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-installation-status',
        'apl-operator',
        expect.objectContaining({
          status: 'completed',
          attempt: '1',
        }),
      )
    })

    test('should retry on bootstrap failure', async () => {
      jest.useRealTimers() // Use real timers for retry delay
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      mockAplOps.bootstrap.mockRejectedValueOnce(new Error('Bootstrap failed')).mockResolvedValue(undefined)

      await installer.initialize()

      // Verify both attempts occurred
      expect(mockAplOps.bootstrap).toHaveBeenCalledTimes(2)
      expect(mockAplOps.install).toHaveBeenCalledTimes(0)

      // Verify failed status was not set
      expect(k8s.createUpdateConfigMap).toHaveBeenCalledTimes(0)
    }, 10000)

    test('should retry on install failure', async () => {
      jest.useRealTimers() // Use real timers for retry delay
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      mockAplOps.install.mockRejectedValueOnce(new Error('Install failed')).mockResolvedValue(undefined)

      await installer.reconcileInstall()

      // Verify both attempts occurred
      expect(mockAplOps.install).toHaveBeenCalledTimes(2)

      // Verify in-progress status was recorded for first attempt
      expect(k8s.createUpdateConfigMap).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-installation-status',
        'apl-operator',
        expect.objectContaining({
          status: 'in-progress',
          attempt: '1',
        }),
      )

      // Verify failed status was recorded with error message
      expect(k8s.createUpdateConfigMap).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-installation-status',
        'apl-operator',
        expect.objectContaining({
          status: 'failed',
          attempt: '1',
          error: 'Install failed',
        }),
      )

      // Verify completion status was recorded for second attempt
      expect(k8s.createUpdateConfigMap).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-installation-status',
        'apl-operator',
        expect.objectContaining({
          status: 'completed',
          attempt: '2',
        }),
      )
    }, 10000)

    test('should retry multiple times on repeated failures', async () => {
      jest.useRealTimers() // Use real timers for retry delay
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      mockAplOps.install
        .mockRejectedValueOnce(new Error('Install failed 1'))
        .mockRejectedValueOnce(new Error('Install failed 2'))
        .mockResolvedValue(undefined)

      await installer.reconcileInstall()

      // Verify three attempts occurred
      expect(mockAplOps.install).toHaveBeenCalledTimes(3)

      // Verify failed status for second attempt
      expect(k8s.createUpdateConfigMap).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-installation-status',
        'apl-operator',
        expect.objectContaining({
          status: 'failed',
          attempt: '2',
        }),
      )

      // Verify completion status for third attempt
      expect(k8s.createUpdateConfigMap).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-installation-status',
        'apl-operator',
        expect.objectContaining({
          status: 'completed',
          attempt: '3',
        }),
      )
    }, 10000)

    test('should handle validateCluster failure', async () => {
      jest.useRealTimers() // Use real timers for retry delay
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      mockAplOps.validateCluster
        .mockRejectedValueOnce(new Error('Cluster validation failed'))
        .mockResolvedValue(undefined)

      await installer.initialize()

      // Verify both attempts occurred
      expect(mockAplOps.validateCluster).toHaveBeenCalledTimes(2)
    }, 10000)

    test('should handle ConfigMap update failure gracefully', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)
      ;(k8s.createUpdateConfigMap as jest.Mock).mockRejectedValue(new Error('ConfigMap update failed'))

      await installer.reconcileInstall()

      // Installation should still complete despite ConfigMap update failure
      expect(mockAplOps.install).toHaveBeenCalledTimes(1)
    })
  })

  describe('isInstalled', () => {
    test('should return completed status when ConfigMap exists and git repo has main branch', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue({
        data: { status: 'completed' },
      })
      // getStoredGitRepoConfig returns valid config
      ;(gitConfig.getStoredGitRepoConfig as jest.Mock).mockResolvedValue({
        authenticatedUrl: 'https://admin:pass@gitea:3000/otomi/values.git',
        repoUrl: 'https://gitea:3000/otomi/values.git',
        branch: 'main',
        email: 'test@test.com',
        username: 'admin',
        password: 'pass',
      })
      // git ls-remote succeeds (main branch exists)
      mockZx.mockReturnValue({
        nothrow: jest.fn().mockReturnValue({
          quiet: jest.fn().mockResolvedValue({ exitCode: 0 }),
        }),
      })

      const isInstalled = await installer.isInstalled()

      expect(k8s.getK8sConfigMap).toHaveBeenCalledWith('apl-operator', 'apl-installation-status', mockCoreApi)
      expect(isInstalled).toBe(true)
      expect(mockAplOps.install).not.toHaveBeenCalled()
    })

    test('should return false when status is completed but git repo has no main branch', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue({
        data: { status: 'completed' },
      })
      ;(gitConfig.getStoredGitRepoConfig as jest.Mock).mockResolvedValue({
        authenticatedUrl: 'https://admin:pass@gitea:3000/otomi/values.git',
        repoUrl: 'https://gitea:3000/otomi/values.git',
        branch: 'main',
        email: 'test@test.com',
        username: 'admin',
        password: 'pass',
      })
      // git ls-remote fails (main branch does not exist)
      mockZx.mockReturnValue({
        nothrow: jest.fn().mockReturnValue({
          quiet: jest.fn().mockResolvedValue({ exitCode: 2 }),
        }),
      })

      const isInstalled = await installer.isInstalled()

      expect(isInstalled).toBe(false)
    })

    test('should return true when ConfigMap does not exist', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)

      const isInstalled = await installer.isInstalled()

      expect(k8s.getK8sConfigMap).toHaveBeenCalledWith('apl-operator', 'apl-installation-status', mockCoreApi)
      expect(isInstalled).toBe(true)
    })

    test('should handle in-progress status', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue({
        data: { status: 'in-progress' },
      })
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      const isInstalled = await installer.isInstalled()

      expect(k8s.getK8sConfigMap).toHaveBeenCalledWith('apl-operator', 'apl-installation-status', mockCoreApi)
      expect(isInstalled).toBe(false)
    })

    test('should handle failed status', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue({
        data: { status: 'failed', error: 'Previous installation failed' },
      })
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      const isInstalled = await installer.isInstalled()

      expect(k8s.getK8sConfigMap).toHaveBeenCalledWith('apl-operator', 'apl-installation-status', mockCoreApi)
      expect(isInstalled).toBe(false)
    })

    test('should return true when git verification fails (gitea not ready)', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue({
        data: { status: 'completed' },
      })
      // getStoredGitRepoConfig throws (cluster issues)
      ;(gitConfig.getStoredGitRepoConfig as jest.Mock).mockRejectedValue(new Error('connection refused'))

      const isInstalled = await installer.isInstalled()

      // Should assume installed when verification can't be performed
      expect(isInstalled).toBe(true)
    })
  })

  describe('setEnvAndCreateSecrets', () => {
    test('should use existing SOPS key from secret', async () => {
      ;(k8s.getK8sSecret as jest.Mock).mockResolvedValueOnce({ SOPS_AGE_KEY: 'existing-sops-key' })

      await installer.setEnvAndCreateSecrets()

      expect(k8s.getK8sSecret).toHaveBeenCalledWith('apl-sops-secrets', 'apl-operator')
      expect(process.env.SOPS_AGE_KEY).toBe('existing-sops-key')
    })

    test('should skip gracefully when SOPS key not found in secret (SealedSecrets in use)', async () => {
      ;(k8s.getK8sSecret as jest.Mock).mockResolvedValue(null)

      await installer.setEnvAndCreateSecrets()

      // Should not throw — SOPS is no longer required (replaced by SealedSecrets + ESO)
      expect(process.env.SOPS_AGE_KEY).toBe('')
    })
  })
})
