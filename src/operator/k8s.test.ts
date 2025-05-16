import { terminal } from '../common/debug'
import { ApplyState, updateApplyState } from './k8s'

jest.mock('@kubernetes/client-node', () => {
  const mocks = {
    readNamespacedConfigMap: jest.fn(),
    replaceNamespacedConfigMap: jest.fn(),
    createNamespacedConfigMap: jest.fn(),
  }

  return {
    KubeConfig: jest.fn().mockImplementation(() => ({
      loadFromDefault: jest.fn(),
      makeApiClient: jest.fn().mockImplementation(() => mocks),
    })),
    CoreV1Api: jest.fn().mockImplementation(() => mocks),
    mocks,
  }
})

// Mock debug module
jest.mock('../common/debug', () => ({
  terminal: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
  })),
}))

describe.skip('updateApplyState', () => {
  let mockCoreV1Api
  let mockTerminal

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Get mock references
    mockCoreV1Api = require('@kubernetes/client-node').mocks
    mockTerminal = terminal('updateApplyState')
  })

  const testState: ApplyState = {
    commitHash: 'abc123',
    status: 'succeeded',
    timestamp: '2025-05-15T10:00:00Z',
    trigger: 'test',
  }

  const testNamespace = 'test-namespace'
  const testConfigMapName = 'test-configmap'

  test('should update existing configmap when it exists', async () => {
    // Mock existing configmap
    const existingConfigMap = {
      metadata: {
        name: testConfigMapName,
      },
      data: {
        someOtherData: 'value',
      },
    }

    mockCoreV1Api.readNamespacedConfigMap.mockResolvedValue({
      body: existingConfigMap,
    })

    await updateApplyState(testState, testNamespace, testConfigMapName)

    // Verify correct client calls
    expect(mockCoreV1Api.readNamespacedConfigMap).toHaveBeenCalledWith(testConfigMapName, testNamespace)

    expect(mockCoreV1Api.replaceNamespacedConfigMap).toHaveBeenCalledWith(testConfigMapName, testNamespace, {
      metadata: {
        name: testConfigMapName,
      },
      data: {
        someOtherData: 'value',
        state: JSON.stringify(testState),
      },
    })

    // Verify logging
    expect(mockTerminal.info).toHaveBeenCalledWith(
      expect.stringContaining(`Updating Apply status: ${testState.status}`),
    )
    expect(mockTerminal.info).toHaveBeenCalledWith(expect.stringContaining(`Apply state updated successfully`))
  })

  test('should create new configmap when it does not exist', async () => {
    const notFoundError = new Error('Not found')
    ;(notFoundError as any).response = { statusCode: 404 }

    mockCoreV1Api.readNamespacedConfigMap.mockRejectedValue(notFoundError)

    await updateApplyState(testState, testNamespace, testConfigMapName)

    expect(mockCoreV1Api.readNamespacedConfigMap).toHaveBeenCalledWith(testConfigMapName, testNamespace)

    expect(mockCoreV1Api.createNamespacedConfigMap).toHaveBeenCalledWith(testNamespace, {
      metadata: {
        name: testConfigMapName,
      },
      data: {
        state: JSON.stringify(testState),
      },
    })

    // Verify logging
    expect(mockTerminal.info).toHaveBeenCalledWith(expect.stringContaining(`Apply state updated successfully`))
  })

  test('should initialize data property if it does not exist', async () => {
    // Mock existing configmap without data
    const existingConfigMap = {
      metadata: {
        name: testConfigMapName,
      },
      // No data property
    }

    mockCoreV1Api.readNamespacedConfigMap.mockResolvedValue({
      body: existingConfigMap,
    })

    await updateApplyState(testState, testNamespace, testConfigMapName)

    // Verify that data was initialized
    expect(mockCoreV1Api.replaceNamespacedConfigMap).toHaveBeenCalledWith(testConfigMapName, testNamespace, {
      metadata: {
        name: testConfigMapName,
      },
      data: {
        state: JSON.stringify(testState),
      },
    })
  })

  test('should handle errors when updating configmap', async () => {
    // Mock a general error
    const generalError = new Error('Something went wrong')

    mockCoreV1Api.readNamespacedConfigMap.mockResolvedValue({
      body: { metadata: { name: testConfigMapName }, data: {} },
    })

    mockCoreV1Api.replaceNamespacedConfigMap.mockRejectedValue(generalError)

    await updateApplyState(testState, testNamespace, testConfigMapName)

    // Verify logging
    expect(mockTerminal.error).toHaveBeenCalledWith('Failed to update apply state:', generalError)
  })

  test('should handle errors when creating configmap', async () => {
    // Mock 404 not found error
    const notFoundError = new Error('Not found')
    ;(notFoundError as any).response = { statusCode: 404 }

    mockCoreV1Api.readNamespacedConfigMap.mockRejectedValue(notFoundError)

    // Mock error during creation
    const createError = new Error('Failed to create ConfigMap')
    mockCoreV1Api.createNamespacedConfigMap.mockRejectedValue(createError)

    await updateApplyState(testState, testNamespace, testConfigMapName)

    // Verify logging
    expect(mockTerminal.error).toHaveBeenCalledWith('Failed to update apply state:', createError)
  })

  test('should handle unexpected errors when reading configmap', async () => {
    // Mock an unexpected error (not 404)
    const unexpectedError = new Error('Unexpected error')
    ;(unexpectedError as any).response = { statusCode: 500 }

    mockCoreV1Api.readNamespacedConfigMap.mockRejectedValue(unexpectedError)

    await updateApplyState(testState, testNamespace, testConfigMapName)

    // Verify error is logged
    expect(mockTerminal.error).toHaveBeenCalledWith('Failed to update apply state:', unexpectedError)

    // Verify no attempt to create ConfigMap
    expect(mockCoreV1Api.createNamespacedConfigMap).not.toHaveBeenCalled()
  })
})
