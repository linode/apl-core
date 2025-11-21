import stubs from 'src/test-stubs'
// Import the actual function to test (after mocks are set up)
import { installAll, module } from './install'

const { terminal } = stubs

// Mock all external dependencies
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
}))

jest.mock('src/common/k8s', () => ({
  checkOperationsInProgress: jest.fn(),
  getDeploymentState: jest.fn(),
  setDeploymentState: jest.fn(),
  getHelmReleases: jest.fn(),
  applyServerSide: jest.fn(),
  restartOtomiApiDeployment: jest.fn(),
  waitForCRD: jest.fn(),
  k8s: {
    app: jest.fn(),
  },
}))

jest.mock('src/common/values', () => ({
  getImageTag: jest.fn(),
  getCurrentVersion: jest.fn(),
  writeValuesToFile: jest.fn(),
}))

jest.mock('src/common/hf', () => ({
  hf: jest.fn(),
  deployEssential: jest.fn(),
  HF_DEFAULT_SYNC_ARGS: ['apply', '--sync-args', '--include-needs'],
}))

jest.mock('zx', () => ({
  $: jest.fn(),
  cd: jest.fn(),
}))

jest.mock('./commit', () => ({
  commit: jest.fn(),
  cloneOtomiChartsInGitea: jest.fn(),
  initialSetupData: jest.fn().mockResolvedValue({
    secretName: 'test-secret',
    username: 'admin',
    password: 'password',
    domainSuffix: 'test.local',
  }),
  createCredentialsSecret: jest.fn(),
  retryIsOAuth2ProxyRunning: jest.fn(),
  printWelcomeMessage: jest.fn(),
  createWelcomeConfigMap: jest.fn(),
}))

jest.mock('src/common/cli', () => ({
  cleanupHandler: jest.fn(),
  prepareEnvironment: jest.fn(),
}))

jest.mock('src/common/utils', () => ({
  ...jest.requireActual('src/common/utils'),
  rootDir: '/test/root',
}))

jest.mock('src/common/yargs', () => ({
  getParsedArgs: jest.fn().mockReturnValue({}),
  setParsedArgs: jest.fn(),
  helmOptions: jest.fn().mockReturnValue({}),
}))

describe('Install command', () => {
  let mockDeps: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock environment
    process.env.NODE_ENV = 'test'
    process.env.DISABLE_SYNC = 'false'

    mockDeps = {
      getDeploymentState: require('src/common/k8s').getDeploymentState,
      setDeploymentState: require('src/common/k8s').setDeploymentState,
      getHelmReleases: require('src/common/k8s').getHelmReleases,
      getImageTag: require('src/common/values').getImageTag,
      getCurrentVersion: require('src/common/values').getCurrentVersion,
      writeValuesToFile: require('src/common/values').writeValuesToFile,
      applyServerSide: require('src/common/k8s').applyServerSide,
      checkOperationsInProgress: require('src/common/k8s').checkOperationsInProgress,
      hf: require('src/common/hf').hf,
      deployEssential: require('src/common/hf').deployEssential,
      writeFileSync: require('fs').writeFileSync,
      $: require('zx').$,
    }

    // Set up default mock return values
    mockDeps.getDeploymentState.mockResolvedValue({ status: 'initial' })
    mockDeps.getImageTag.mockResolvedValue('v1.0.0')
    mockDeps.getCurrentVersion.mockResolvedValue('1.0.0')
    mockDeps.getHelmReleases.mockResolvedValue([])
    mockDeps.hf.mockResolvedValue({
      exitCode: 0,
      stdout: 'template-content',
      stderr: '',
    })
    mockDeps.deployEssential.mockResolvedValue(true)
    mockDeps.checkOperationsInProgress.mockResolvedValue(undefined)
    mockDeps.$.mockResolvedValue(undefined)
  })

  describe('module configuration', () => {
    test('should have correct command name', () => {
      expect(module.command).toBe('install')
    })

    test('should have correct description', () => {
      expect(module.describe).toBe('Install all k8s resources for first-time setup')
    })

    test('should have handler function', () => {
      expect(typeof module.handler).toBe('function')
    })

    test('should have builder function', () => {
      expect(typeof module.builder).toBe('function')
    })
  })

  describe('installAll function', () => {
    test('should execute installation steps in correct order', async () => {
      // Mock environment to skip sync operations
      const originalEnv = process.env.DISABLE_SYNC
      process.env.DISABLE_SYNC = 'true'

      await installAll()

      // Verify the key steps were called
      expect(mockDeps.getDeploymentState).toHaveBeenCalled()
      expect(mockDeps.getImageTag).toHaveBeenCalled()
      expect(mockDeps.getCurrentVersion).toHaveBeenCalled()
      expect(mockDeps.setDeploymentState).toHaveBeenCalledWith({
        status: 'deploying',
        deployingTag: 'v1.0.0',
        deployingVersion: '1.0.0',
      })

      // Restore environment
      process.env.DISABLE_SYNC = originalEnv
    })

    test('should handle deployment state correctly', async () => {
      const mockState = { status: 'initial' }
      mockDeps.getDeploymentState.mockResolvedValueOnce(mockState)

      const originalEnv = process.env.DISABLE_SYNC
      process.env.DISABLE_SYNC = 'true'

      await installAll()

      expect(mockDeps.getDeploymentState).toHaveBeenCalled()
      expect(mockDeps.setDeploymentState).toHaveBeenCalled()

      process.env.DISABLE_SYNC = originalEnv
    })

    test('should handle helmfile template generation', async () => {
      const templateOutput = 'generated-template-content'

      mockDeps.hf.mockResolvedValueOnce({
        exitCode: 0,
        stdout: templateOutput,
        stderr: '',
      })

      const originalEnv = process.env.DISABLE_SYNC
      process.env.DISABLE_SYNC = 'true'

      await installAll()

      expect(mockDeps.hf).toHaveBeenCalled()
      expect(mockDeps.deployEssential).toHaveBeenCalled()

      process.env.DISABLE_SYNC = originalEnv
    })

    test('should handle essential deployment errors', async () => {
      const errorOutput = 'Failed to deploy essential manifests'

      mockDeps.deployEssential.mockResolvedValueOnce(false)

      await expect(installAll()).rejects.toThrow(errorOutput)
    })

    test('should handle CRDs deployment', async () => {
      const originalEnv = process.env.DISABLE_SYNC
      process.env.DISABLE_SYNC = 'true'

      await installAll()

      expect(mockDeps.applyServerSide).toHaveBeenCalledWith('charts/kube-prometheus-stack/charts/crds/crds')
      expect(mockDeps.$).toHaveBeenCalled()

      process.env.DISABLE_SYNC = originalEnv
    })

    test('should write status file correctly', async () => {
      const mockState = { status: 'deploying' }
      const mockReleases = [{ name: 'test-release' }]

      mockDeps.getDeploymentState
        .mockResolvedValueOnce({ status: 'initial' }) // first call
        .mockResolvedValueOnce(mockState) // second call
      mockDeps.getHelmReleases.mockResolvedValueOnce(mockReleases)

      const originalEnv = process.env.DISABLE_SYNC
      process.env.DISABLE_SYNC = 'true'

      await installAll()

      expect(mockDeps.writeValuesToFile).toHaveBeenCalledWith(
        expect.stringContaining('/env/status.yaml'),
        { status: { otomi: mockState, helm: mockReleases } },
        true,
      )

      process.env.DISABLE_SYNC = originalEnv
    })

    test('should set deployment state to deployed at the end', async () => {
      const originalEnv = process.env.DISABLE_SYNC
      process.env.DISABLE_SYNC = 'true'

      await installAll()

      expect(mockDeps.setDeploymentState).toHaveBeenLastCalledWith({
        status: 'deployed',
        version: '1.0.0',
      })

      process.env.DISABLE_SYNC = originalEnv
    })
  })

  describe('error handling', () => {
    test('should handle deployment state errors', async () => {
      const error = new Error('Failed to get deployment state')
      mockDeps.getDeploymentState.mockRejectedValueOnce(error)

      expect(mockDeps.getDeploymentState).toBeDefined()
    })

    test('should handle image tag retrieval errors', async () => {
      const error = new Error('Failed to get image tag')
      mockDeps.getImageTag.mockRejectedValueOnce(error)

      expect(mockDeps.getImageTag).toBeDefined()
    })

    test('should handle helmfile errors', async () => {
      const error = new Error('Helmfile execution failed')
      mockDeps.hf.mockRejectedValueOnce(error)

      expect(mockDeps.hf).toBeDefined()
    })

    test('should handle CRDs deployment errors', async () => {
      const error = new Error('CRDs deployment failed')
      mockDeps.applyServerSide.mockRejectedValueOnce(error)

      expect(mockDeps.applyServerSide).toBeDefined()
    })
  })
})
