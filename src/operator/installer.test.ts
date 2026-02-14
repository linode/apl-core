import { hfValues } from '../common/hf'
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

jest.mock('../common/envalid', () => ({
  env: {
    GIT_PROTOCOL: 'http',
    GIT_URL: 'gitea-http.gitea.svc.cluster.local',
    GIT_PORT: '3000',
  },
}))

jest.mock('./validators', () => ({
  operatorEnv: {
    GIT_ORG: 'otomi',
    GIT_REPO: 'values',
  },
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
  deletePendingHelmReleases: jest.fn(),
  getK8sConfigMap: jest.fn(),
  getK8sSecret: jest.fn(),
  createUpdateConfigMap: jest.fn(),
  createUpdateGenericSecret: jest.fn(),
  k8s: {
    core: jest.fn(),
  },
}))

jest.mock('../common/hf', () => ({
  hfValues: jest.fn(),
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

      // Verify failed status was recorded
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
          error: 'Install failed 2',
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
      // getK8sSecret returns credentials for git verification
      ;(k8s.getK8sSecret as jest.Mock).mockResolvedValue({ GIT_USERNAME: 'admin', GIT_PASSWORD: 'pass' })
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
      ;(k8s.getK8sSecret as jest.Mock).mockResolvedValue({ GIT_USERNAME: 'admin', GIT_PASSWORD: 'pass' })
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
      // getK8sSecret throws (cluster issues)
      ;(k8s.getK8sSecret as jest.Mock).mockRejectedValue(new Error('connection refused'))

      const isInstalled = await installer.isInstalled()

      // Should assume installed when verification can't be performed
      expect(isInstalled).toBe(true)
    })
  })

  describe('setEnvAndCreateSecrets', () => {
    test('should use existing credentials from secrets when available', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce({ SOPS_AGE_KEY: 'existing-sops-key' }) // apl-sops-secrets
        .mockResolvedValueOnce({ GIT_USERNAME: 'existing-admin', GIT_PASSWORD: 'existing-password' }) // gitea-credentials

      const result = await installer.setEnvAndCreateSecrets()

      expect(k8s.getK8sSecret).toHaveBeenCalledWith('apl-sops-secrets', 'apl-operator')
      expect(k8s.getK8sSecret).toHaveBeenCalledWith('gitea-credentials', 'apl-operator')
      expect(process.env.SOPS_AGE_KEY).toBe('existing-sops-key')
      expect(result).toEqual({
        username: 'existing-admin',
        password: 'existing-password',
      })
      expect(hfValues).not.toHaveBeenCalled()
      expect(k8s.createUpdateGenericSecret).not.toHaveBeenCalled()
    })

    test('should extract credentials and create secrets when secrets do not exist', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce(null) // apl-sops-secrets
        .mockResolvedValueOnce(null) // gitea-credentials
        .mockResolvedValueOnce({ adminUsername: 'test-admin', adminPassword: 'test-password' }) // gitea-secrets
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      const result = await installer.setEnvAndCreateSecrets()

      // SOPS is no longer used — hfValues should NOT be called for SOPS key extraction
      expect(hfValues).not.toHaveBeenCalled()
      expect(k8s.createUpdateGenericSecret).toHaveBeenCalledWith(mockCoreApi, 'gitea-credentials', 'apl-operator', {
        GIT_USERNAME: 'test-admin',
        GIT_PASSWORD: 'test-password',
      })
      expect(result).toEqual({
        username: 'test-admin',
        password: 'test-password',
      })
    })

    test('should use default username when not provided in K8s secret', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce(null) // apl-sops-secrets
        .mockResolvedValueOnce(null) // gitea-credentials
        .mockResolvedValueOnce({ adminPassword: 'test-password' }) // gitea-secrets (no adminUsername)
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      const result = await installer.setEnvAndCreateSecrets()

      expect(result).toEqual({
        username: 'otomi-admin',
        password: 'test-password',
      })
    })

    test('should throw error when password is missing from gitea-secrets', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce(null) // apl-sops-secrets
        .mockResolvedValueOnce(null) // gitea-credentials
        .mockResolvedValueOnce({ adminUsername: 'test-admin' }) // gitea-secrets (no adminPassword)

      await expect(installer.setEnvAndCreateSecrets()).rejects.toThrow(
        'Git credentials not found in gitea-secrets K8s Secret',
      )
    })

    test('should use default username when username is empty string in K8s secret', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce(null) // apl-sops-secrets
        .mockResolvedValueOnce(null) // gitea-credentials
        .mockResolvedValueOnce({ adminUsername: '', adminPassword: 'test-password' }) // gitea-secrets
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      const result = await installer.setEnvAndCreateSecrets()

      // Empty string falls back to default due to ternary check
      expect(result).toEqual({
        username: 'otomi-admin',
        password: 'test-password',
      })
    })

    test('should throw error when password is empty string in K8s secret', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce(null) // apl-sops-secrets
        .mockResolvedValueOnce(null) // gitea-credentials
        .mockResolvedValueOnce({ adminUsername: 'test-admin', adminPassword: '' }) // gitea-secrets

      await expect(installer.setEnvAndCreateSecrets()).rejects.toThrow(
        'Git credentials not found in gitea-secrets K8s Secret',
      )
    })

    test('should skip SOPS setup when secret has no key (SealedSecrets in use)', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce(null) // apl-sops-secrets
        .mockResolvedValueOnce(null) // gitea-credentials
        .mockResolvedValueOnce({ adminUsername: 'test-admin', adminPassword: 'test-password' }) // gitea-secrets
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      await installer.setEnvAndCreateSecrets()

      // SOPS is no longer used — hfValues should NOT be called
      expect(hfValues).not.toHaveBeenCalled()
      expect(process.env.SOPS_AGE_KEY).toBe('')
    })

    test('should handle secret creation failure', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce(null) // apl-sops-secrets
        .mockResolvedValueOnce(null) // gitea-credentials
        .mockResolvedValueOnce({ adminUsername: 'test-admin', adminPassword: 'test-password' }) // gitea-secrets
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockRejectedValue(new Error('Secret creation failed'))

      await expect(installer.setEnvAndCreateSecrets()).rejects.toThrow('Secret creation failed')
    })

    test('should read gitea credentials from gitea-secrets K8s Secret', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce(null) // apl-sops-secrets
        .mockResolvedValueOnce(null) // gitea-credentials
        .mockResolvedValueOnce({ adminUsername: 'nested-admin', adminPassword: 'nested-password' }) // gitea-secrets
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      const result = await installer.setEnvAndCreateSecrets()

      expect(k8s.getK8sSecret).toHaveBeenCalledWith('gitea-secrets', 'sealed-secrets')
      expect(result).toEqual({
        username: 'nested-admin',
        password: 'nested-password',
      })
    })

    test('should use only existing SOPS secret when gitea credentials need creation', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce({ SOPS_AGE_KEY: 'existing-sops-key' }) // apl-sops-secrets exists
        .mockResolvedValueOnce(null) // gitea-credentials does not exist
        .mockResolvedValueOnce({ adminUsername: 'test-admin', adminPassword: 'test-password' }) // gitea-secrets
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      const result = await installer.setEnvAndCreateSecrets()

      expect(process.env.SOPS_AGE_KEY).toBe('existing-sops-key')
      expect(result).toEqual({
        username: 'test-admin',
        password: 'test-password',
      })
      expect(k8s.createUpdateGenericSecret).toHaveBeenCalledWith(mockCoreApi, 'gitea-credentials', 'apl-operator', {
        GIT_USERNAME: 'test-admin',
        GIT_PASSWORD: 'test-password',
      })
      expect(k8s.createUpdateGenericSecret).toHaveBeenCalledTimes(1)
    })

    test('should use only existing gitea credentials when SOPS secret is empty', async () => {
      ;(k8s.getK8sSecret as jest.Mock)
        .mockResolvedValueOnce(null) // apl-sops-secrets does not exist
        .mockResolvedValueOnce({ GIT_USERNAME: 'existing-admin', GIT_PASSWORD: 'existing-password' }) // gitea-credentials exists

      const result = await installer.setEnvAndCreateSecrets()

      // SOPS skipped, hfValues not called
      expect(hfValues).not.toHaveBeenCalled()
      expect(result).toEqual({
        username: 'existing-admin',
        password: 'existing-password',
      })
      expect(k8s.createUpdateGenericSecret).not.toHaveBeenCalled()
    })
  })
})
