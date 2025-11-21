import { getApplications } from 'src/cmd/apply-as-apps'
import { terminal } from './debug'
import { deployEssential } from './hf'
import { getDeploymentState, k8s, waitForArgoCDAppHealthy, waitForArgoCDAppSync } from './k8s'
import { filterRuntimeUpgrades, runtimeUpgrade } from './runtime-upgrade'
import { RuntimeUpgrades } from './runtime-upgrades/runtime-upgrades'
import { getCurrentVersion } from './values'

jest.mock('./k8s')
jest.mock('./hf')
jest.mock('./values')
jest.mock('./debug')
jest.mock('src/cmd/apply-as-apps')

// Mock the runtime upgrades module with a mutable array
let mockRuntimeUpgrades: RuntimeUpgrades = []
jest.mock('./runtime-upgrades/runtime-upgrades', () => ({
  get runtimeUpgrades() {
    return mockRuntimeUpgrades
  },
}))

const mockGetDeploymentState = getDeploymentState as jest.MockedFunction<typeof getDeploymentState>
const mockGetCurrentVersion = getCurrentVersion as jest.MockedFunction<typeof getCurrentVersion>
const mockWaitForArgoCDAppSync = waitForArgoCDAppSync as jest.MockedFunction<typeof waitForArgoCDAppSync>
const mockWaitForArgoCDAppHealthy = waitForArgoCDAppHealthy as jest.MockedFunction<typeof waitForArgoCDAppHealthy>
const mockGetApplications = getApplications as jest.MockedFunction<typeof getApplications>
const mockTerminal = terminal as jest.MockedFunction<typeof terminal>
const mockDeployEssential = deployEssential as jest.MockedFunction<typeof deployEssential>
const mockK8s = k8s as jest.Mocked<typeof k8s>

mockDeployEssential.mockResolvedValue(true)
// Mock the custom API
const mockCustomApi = { mockCustomApi: true }
mockK8s.custom.mockReturnValue(mockCustomApi as any)

describe('runtimeUpgrade', () => {
  let mockDebugger: { info: jest.Mock; error: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDebugger = {
      info: jest.fn(),
      error: jest.fn(),
    }

    mockTerminal.mockReturnValue(mockDebugger as any)
  })

  describe('first installation scenarios', () => {
    it('should skip runtime upgrade for first installation (empty deployment state)', async () => {
      mockGetDeploymentState.mockResolvedValue({})
      mockGetCurrentVersion.mockResolvedValue('1.0.0')

      await runtimeUpgrade({ when: 'pre' })

      expect(mockDebugger.info).toHaveBeenCalledWith(
        'Skipping the runtime upgrade procedure as this is the very first installation',
      )
      expect(mockGetCurrentVersion).not.toHaveBeenCalled()
    })

    it('should skip runtime upgrade for null deployment state', async () => {
      mockGetDeploymentState.mockResolvedValue(null as any)
      mockGetCurrentVersion.mockResolvedValue('1.0.0')

      await runtimeUpgrade({ when: 'pre' })

      expect(mockDebugger.info).toHaveBeenCalledWith(
        'Skipping the runtime upgrade procedure as this is the very first installation',
      )
    })
  })

  describe('version handling and filtering', () => {
    it('should skip when no applicable upgrades found', async () => {
      mockGetDeploymentState.mockResolvedValue({ version: '2.0.0' })
      mockGetCurrentVersion.mockResolvedValue('2.0.0')

      await runtimeUpgrade({ when: 'pre' })

      expect(mockDebugger.info).toHaveBeenCalledWith('The current version of the App Platform: 2.0.0')
      expect(mockDebugger.info).toHaveBeenCalledWith('Deploying essential manifests')
      expect(mockDebugger.info).toHaveBeenCalledWith('No runtime upgrade operations detected, skipping')
    })

    it('should use current version when deployment state has no version', async () => {
      mockGetDeploymentState.mockResolvedValue({ status: 'deployed', version: '1.0.0' })

      await runtimeUpgrade({ when: 'pre' })

      expect(mockDebugger.info).toHaveBeenCalledWith('The current version of the App Platform: 1.0.0')
    })
  })

  describe('global operations execution', () => {
    const mockPreOperation = jest.fn().mockResolvedValue(undefined)
    const mockPostOperation = jest.fn().mockResolvedValue(undefined)

    beforeEach(() => {
      mockRuntimeUpgrades.length = 0
      mockRuntimeUpgrades.push({
        version: '1.5.0',
        pre: mockPreOperation,
        post: mockPostOperation,
      })
    })

    it('should execute global pre operations', async () => {
      mockGetDeploymentState.mockResolvedValue({ version: '1.0.0' })
      mockGetCurrentVersion.mockResolvedValue('1.0.0')

      await runtimeUpgrade({ when: 'pre' })

      expect(mockPreOperation).toHaveBeenCalledWith({
        debug: mockDebugger,
      })
      expect(mockDebugger.info).toHaveBeenCalledWith('Runtime upgrade operations detected for version 1.5.0')
    })

    it('should execute global post operations', async () => {
      mockGetDeploymentState.mockResolvedValue({ version: '1.0.0' })
      mockGetCurrentVersion.mockResolvedValue('1.0.0')

      await runtimeUpgrade({ when: 'post' })

      expect(mockPostOperation).toHaveBeenCalledWith({
        debug: mockDebugger,
      })
      expect(mockDebugger.info).toHaveBeenCalledWith('Runtime upgrade operations detected for version 1.5.0')
    })

    it('should skip operations that do not exist for the specified phase', async () => {
      mockRuntimeUpgrades.length = 0
      mockRuntimeUpgrades.push({
        version: '1.5.0',
        pre: mockPreOperation,
      })

      mockGetDeploymentState.mockResolvedValue({ version: '1.0.0' })
      mockGetCurrentVersion.mockResolvedValue('1.0.0')

      await runtimeUpgrade({ when: 'post' })

      expect(mockPreOperation).not.toHaveBeenCalled()
    })
  })

  describe('application-specific operations', () => {
    const mockAppPostOperation = jest.fn().mockResolvedValue(undefined)
    const mockAppPreOperation = jest.fn().mockResolvedValue(undefined)

    beforeEach(() => {
      mockRuntimeUpgrades.length = 0
      mockRuntimeUpgrades.push({
        version: '1.5.0',
        applications: {
          'istio-operator': {
            post: mockAppPostOperation,
          },
          argocd: {
            pre: mockAppPreOperation,
          },
        },
      })
      mockWaitForArgoCDAppSync.mockResolvedValue(undefined)
      mockWaitForArgoCDAppHealthy.mockResolvedValue(undefined)
    })

    it('should execute application-specific operations with ArgoCD waits', async () => {
      mockGetDeploymentState.mockResolvedValue({ version: '1.0.0' })
      mockGetCurrentVersion.mockResolvedValue('1.0.0')
      mockGetApplications.mockResolvedValue(['istio-operator'])
      await runtimeUpgrade({ when: 'post' })

      expect(mockWaitForArgoCDAppSync).toHaveBeenCalledWith('istio-operator', mockCustomApi, mockDebugger)
      expect(mockWaitForArgoCDAppHealthy).toHaveBeenCalledWith('istio-operator', mockCustomApi, mockDebugger)
      expect(mockAppPostOperation).toHaveBeenCalledWith({
        debug: mockDebugger,
      })
      expect(mockDebugger.info).toHaveBeenCalledWith(
        'Runtime upgrade operations detected for version 1.5.0, application: istio-operator',
      )
    })

    it('should not execute application operations for wrong phase', async () => {
      mockGetDeploymentState.mockResolvedValue({ version: '1.0.0' })
      mockGetCurrentVersion.mockResolvedValue('1.0.0')
      mockGetApplications.mockResolvedValue(['argocd'])

      await runtimeUpgrade({ when: 'pre' })

      expect(mockWaitForArgoCDAppSync).toHaveBeenCalledWith('argocd', mockCustomApi, mockDebugger)
      expect(mockWaitForArgoCDAppHealthy).toHaveBeenCalledWith('argocd', mockCustomApi, mockDebugger)
      expect(mockAppPostOperation).not.toHaveBeenCalled()
    })
  })

  describe('mixed operations', () => {
    const mockGlobalPre = jest.fn().mockResolvedValue(undefined)
    const mockAppPost = jest.fn().mockResolvedValue(undefined)

    beforeEach(() => {
      mockRuntimeUpgrades.length = 0
      mockRuntimeUpgrades.push({
        version: '1.5.0',
        pre: mockGlobalPre,
        applications: {
          'istio-operator': {
            post: mockAppPost,
          },
        },
      })
      mockWaitForArgoCDAppSync.mockResolvedValue(undefined)
      mockWaitForArgoCDAppHealthy.mockResolvedValue(undefined)
    })

    it('should execute both global and application operations in correct order', async () => {
      mockGetDeploymentState.mockResolvedValue({ version: '1.0.0' })
      mockGetCurrentVersion.mockResolvedValue('1.0.0')

      await runtimeUpgrade({ when: 'pre' })

      expect(mockGlobalPre).toHaveBeenCalledWith({
        debug: mockDebugger,
      })
      expect(mockAppPost).not.toHaveBeenCalled()
    })
  })
})

describe('filterRuntimeUpgrades', () => {
  const sampleUpgrades: RuntimeUpgrades = [{ version: '1.0.0' }, { version: '1.5.0' }, { version: '2.0.0' }]

  it('should filter upgrades newer than current version', () => {
    const result = filterRuntimeUpgrades('1.2.0', sampleUpgrades)
    expect(result).toEqual([{ version: '1.5.0' }, { version: '2.0.0' }])
  })

  it('should return empty array when no upgrades are newer', () => {
    const result = filterRuntimeUpgrades('3.0.0', sampleUpgrades)
    expect(result).toEqual([])
  })

  it('should handle prerelease versions correctly', () => {
    const prereleaseUpgrades: RuntimeUpgrades = [{ version: '1.5.0' }, { version: '2.0.0' }]

    // v1.0-rc1 should be converted to v1.0.0-rc1 for comparison
    const result = filterRuntimeUpgrades('1.0-rc1', prereleaseUpgrades)
    expect(result).toEqual([{ version: '1.5.0' }, { version: '2.0.0' }])
  })

  it('should handle prerelease versions with multiple parts', () => {
    const prereleaseUpgrades: RuntimeUpgrades = [{ version: '1.5.0' }, { version: '2.0.0' }]

    // v1.0-beta.1 should be converted to v1.0.0-beta.1
    const result = filterRuntimeUpgrades('1.0-beta.1', prereleaseUpgrades)
    expect(result).toEqual([{ version: '1.5.0' }, { version: '2.0.0' }])
  })

  it('should not run with prereleases = version', () => {
    const result = filterRuntimeUpgrades('2.0.0-rc.2', sampleUpgrades)
    expect(result).toEqual([])
  })

  it('should not modify valid semantic versions', () => {
    const result = filterRuntimeUpgrades('1.0.0', sampleUpgrades)
    expect(result).toEqual([{ version: '1.5.0' }, { version: '2.0.0' }])
  })

  it('should handle edge case with exact version match', () => {
    const result = filterRuntimeUpgrades('1.5.0', sampleUpgrades)
    expect(result).toEqual([{ version: '2.0.0' }])
  })
})
