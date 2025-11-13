import { Installer } from './installer'
import { AplOperations } from './apl-operations'
import { OperatorError } from './errors'
import * as k8s from '../common/k8s'
import { hfValues } from '../common/hf'

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
    process.env.GIT_USERNAME = ''
    process.env.GIT_PASSWORD = ''
    process.env.SOPS_AGE_KEY = ''
    process.env.CI = ''

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

  describe('reconcileInstall', () => {
    test('should complete fresh installation successfully', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      await installer.reconcileInstall()

      expect(mockAplOps.validateCluster).toHaveBeenCalledTimes(1)
      expect(mockAplOps.bootstrap).toHaveBeenCalledTimes(1)
      expect(k8s.getK8sConfigMap).toHaveBeenCalledWith('apl-operator', 'apl-installation-status', mockCoreApi)
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

    test('should skip install when already completed', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue({
        data: { status: 'completed' },
      })

      await installer.reconcileInstall()

      expect(mockAplOps.validateCluster).toHaveBeenCalledTimes(1)
      expect(mockAplOps.bootstrap).toHaveBeenCalledTimes(1)
      expect(mockAplOps.install).not.toHaveBeenCalled()
    })

    test('should retry on bootstrap failure', async () => {
      jest.useRealTimers() // Use real timers for retry delay
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      mockAplOps.bootstrap.mockRejectedValueOnce(new Error('Bootstrap failed')).mockResolvedValue(undefined)

      await installer.reconcileInstall()

      // Verify both attempts occurred
      expect(mockAplOps.bootstrap).toHaveBeenCalledTimes(2)
      expect(mockAplOps.install).toHaveBeenCalledTimes(1)

      // Verify failed status was recorded
      expect(k8s.createUpdateConfigMap).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-installation-status',
        'apl-operator',
        expect.objectContaining({
          status: 'failed',
          attempt: '1',
          error: 'Bootstrap failed',
        }),
      )

      // Verify completion status was recorded
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

      await installer.reconcileInstall()

      // Verify both attempts occurred
      expect(mockAplOps.validateCluster).toHaveBeenCalledTimes(2)

      // Verify failed status was recorded
      expect(k8s.createUpdateConfigMap).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-installation-status',
        'apl-operator',
        expect.objectContaining({
          status: 'failed',
          attempt: '1',
          error: 'Cluster validation failed',
        }),
      )

      // Verify completion status was recorded
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

    test('should handle ConfigMap update failure gracefully', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)
      ;(k8s.createUpdateConfigMap as jest.Mock).mockRejectedValue(new Error('ConfigMap update failed'))

      await installer.reconcileInstall()

      // Installation should still complete despite ConfigMap update failure
      expect(mockAplOps.install).toHaveBeenCalledTimes(1)
      expect(mockAplOps.validateCluster).toHaveBeenCalledTimes(1)
      expect(mockAplOps.bootstrap).toHaveBeenCalledTimes(1)
    })
  })

  describe('getInstallationStatus (tested indirectly)', () => {
    test('should return completed status when ConfigMap exists', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue({
        data: { status: 'completed' },
      })

      await installer.reconcileInstall()

      expect(k8s.getK8sConfigMap).toHaveBeenCalledWith('apl-operator', 'apl-installation-status', mockCoreApi)
      expect(mockAplOps.install).not.toHaveBeenCalled()
    })

    test('should return pending when ConfigMap does not exist', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue(null)
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      await installer.reconcileInstall()

      expect(mockAplOps.install).toHaveBeenCalled()
    })

    test('should return pending when ConfigMap fetch fails', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockRejectedValue(new Error('Not found'))
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      await installer.reconcileInstall()

      expect(mockAplOps.install).toHaveBeenCalled()
    })

    test('should handle in-progress status', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue({
        data: { status: 'in-progress' },
      })
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      await installer.reconcileInstall()

      // Should proceed with installation when status is in-progress
      expect(mockAplOps.install).toHaveBeenCalled()
    })

    test('should handle failed status', async () => {
      ;(k8s.getK8sConfigMap as jest.Mock).mockResolvedValue({
        data: { status: 'failed', error: 'Previous installation failed' },
      })
      ;(k8s.createUpdateConfigMap as jest.Mock).mockResolvedValue(undefined)

      await installer.reconcileInstall()

      // Should proceed with installation when status is failed
      expect(mockAplOps.install).toHaveBeenCalled()
    })
  })

  describe('setEnvAndCreateSecrets', () => {
    test('should extract credentials and create secrets successfully', async () => {
      const mockValues = {
        apps: {
          gitea: {
            adminUsername: 'test-admin',
            adminPassword: 'test-password',
          },
        },
        kms: {
          sops: {
            age: {
              privateKey: 'AGE-SECRET-KEY-1234567890',
            },
          },
        },
      }

      ;(hfValues as jest.Mock).mockResolvedValue(mockValues)
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      const result = await installer.setEnvAndCreateSecrets()

      expect(hfValues).toHaveBeenCalled()
      expect(k8s.createUpdateGenericSecret).toHaveBeenCalledWith(mockCoreApi, 'gitea-credentials', 'apl-operator', {
        GIT_USERNAME: 'test-admin',
        GIT_PASSWORD: 'test-password',
      })
      expect(result).toEqual({
        username: 'test-admin',
        password: 'test-password',
      })
      expect(process.env.GIT_USERNAME).toBe('test-admin')
      expect(process.env.GIT_PASSWORD).toBe('test-password')
      expect(process.env.SOPS_AGE_KEY).toBe('AGE-SECRET-KEY-1234567890')
      expect(process.env.CI).toBe('true')
    })

    test('should use default username when not provided', async () => {
      const mockValues = {
        apps: {
          gitea: {
            adminPassword: 'test-password',
          },
        },
        kms: {
          sops: {
            age: {
              privateKey: 'AGE-SECRET-KEY-1234567890',
            },
          },
        },
      }

      ;(hfValues as jest.Mock).mockResolvedValue(mockValues)
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      const result = await installer.setEnvAndCreateSecrets()

      expect(result).toEqual({
        username: 'otomi-admin',
        password: 'test-password',
      })
      expect(process.env.GIT_USERNAME).toBe('otomi-admin')
    })

    test('should throw error when password is missing', async () => {
      const mockValues = {
        apps: {
          gitea: {
            adminUsername: 'test-admin',
          },
        },
      }

      ;(hfValues as jest.Mock).mockResolvedValue(mockValues)

      await expect(installer.setEnvAndCreateSecrets()).rejects.toThrow('Git credentials not found in values')
    })

    test('should use default username when username is empty string', async () => {
      const mockValues = {
        apps: {
          gitea: {
            adminUsername: '',
            adminPassword: 'test-password',
          },
        },
      }

      ;(hfValues as jest.Mock).mockResolvedValue(mockValues)
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      const result = await installer.setEnvAndCreateSecrets()

      // Empty string falls back to default due to || operator
      expect(result).toEqual({
        username: 'otomi-admin',
        password: 'test-password',
      })
      expect(process.env.GIT_USERNAME).toBe('otomi-admin')
    })

    test('should throw error when password is empty string', async () => {
      const mockValues = {
        apps: {
          gitea: {
            adminUsername: 'test-admin',
            adminPassword: '',
          },
        },
      }

      ;(hfValues as jest.Mock).mockResolvedValue(mockValues)

      await expect(installer.setEnvAndCreateSecrets()).rejects.toThrow('Git credentials not found in values')
    })

    test('should skip SOPS key when encrypted', async () => {
      const mockValues = {
        apps: {
          gitea: {
            adminUsername: 'test-admin',
            adminPassword: 'test-password',
          },
        },
        kms: {
          sops: {
            age: {
              privateKey: 'ENC[AES256_GCM,data:encrypted]',
            },
          },
        },
      }

      ;(hfValues as jest.Mock).mockResolvedValue(mockValues)
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      await installer.setEnvAndCreateSecrets()

      expect(process.env.SOPS_AGE_KEY).toBe('')
    })

    test('should skip SOPS key when not provided', async () => {
      const mockValues = {
        apps: {
          gitea: {
            adminUsername: 'test-admin',
            adminPassword: 'test-password',
          },
        },
      }

      ;(hfValues as jest.Mock).mockResolvedValue(mockValues)
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      await installer.setEnvAndCreateSecrets()

      expect(process.env.SOPS_AGE_KEY).toBe('')
    })

    test('should handle hfValues failure', async () => {
      ;(hfValues as jest.Mock).mockRejectedValue(new Error('Failed to get values'))

      await expect(installer.setEnvAndCreateSecrets()).rejects.toThrow('Failed to get values')
    })

    test('should handle secret creation failure', async () => {
      const mockValues = {
        apps: {
          gitea: {
            adminUsername: 'test-admin',
            adminPassword: 'test-password',
          },
        },
      }

      ;(hfValues as jest.Mock).mockResolvedValue(mockValues)
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockRejectedValue(new Error('Secret creation failed'))

      await expect(installer.setEnvAndCreateSecrets()).rejects.toThrow('Secret creation failed')
    })

    test('should handle nested gitea structure', async () => {
      const mockValues = {
        apps: {
          gitea: {
            adminUsername: 'nested-admin',
            adminPassword: 'nested-password',
          },
        },
        kms: {
          sops: {
            age: {
              privateKey: 'AGE-SECRET-KEY-NESTED',
            },
          },
        },
      }

      ;(hfValues as jest.Mock).mockResolvedValue(mockValues)
      ;(k8s.createUpdateGenericSecret as jest.Mock).mockResolvedValue(undefined)

      const result = await installer.setEnvAndCreateSecrets()

      expect(result).toEqual({
        username: 'nested-admin',
        password: 'nested-password',
      })
      expect(process.env.SOPS_AGE_KEY).toBe('AGE-SECRET-KEY-NESTED')
    })
  })
})
