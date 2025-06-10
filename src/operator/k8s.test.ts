import { ApplyState, updateApplyState } from './k8s'
import { CoreV1Api } from '@kubernetes/client-node'

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

jest.mock('../common/debug', () => ({
  terminal: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    error: jest.fn(),
  })),
}))

describe('updateApplyState', () => {
  let mockCoreV1Api

  beforeEach(() => {
    jest.clearAllMocks()

    mockCoreV1Api = new CoreV1Api({} as any) as jest.Mocked<CoreV1Api>
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
    const existingConfigMap = {
      metadata: {
        name: testConfigMapName,
      },
      data: {
        someOtherData: 'value',
      },
    }

    mockCoreV1Api.readNamespacedConfigMap.mockResolvedValue(existingConfigMap)

    await updateApplyState(testState, testNamespace, testConfigMapName)

    expect(mockCoreV1Api.readNamespacedConfigMap).toHaveBeenCalledWith({
      name: 'test-configmap',
      namespace: 'test-namespace',
    })

    expect(mockCoreV1Api.replaceNamespacedConfigMap).toHaveBeenCalledWith({
      body: {
        data: {
          someOtherData: 'value',
          state: '{"commitHash":"abc123","status":"succeeded","timestamp":"2025-05-15T10:00:00Z","trigger":"test"}',
        },
        metadata: { name: 'test-configmap' },
      },
      name: 'test-configmap',
      namespace: 'test-namespace',
    })
  })

  test('should create new configmap when it does not exist', async () => {
    const notFoundError = new Error('Not found')
    ;(notFoundError as any).response = { statusCode: 404 }

    mockCoreV1Api.readNamespacedConfigMap.mockRejectedValue(notFoundError)

    await updateApplyState(testState, testNamespace, testConfigMapName)

    expect(mockCoreV1Api.readNamespacedConfigMap).toHaveBeenCalledWith({
      name: 'test-configmap',
      namespace: 'test-namespace',
    })

    expect(mockCoreV1Api.createNamespacedConfigMap).toHaveBeenCalledWith({
      body: {
        data: {
          state: '{"commitHash":"abc123","status":"succeeded","timestamp":"2025-05-15T10:00:00Z","trigger":"test"}',
        },
        metadata: { name: 'test-configmap' },
      },
      namespace: 'test-namespace',
    })
  })

  test('should initialize data property if it does not exist', async () => {
    const existingConfigMap = {
      metadata: {
        name: testConfigMapName,
      },
    }

    mockCoreV1Api.readNamespacedConfigMap.mockResolvedValue({
      body: existingConfigMap,
    })

    await updateApplyState(testState, testNamespace, testConfigMapName)

    expect(mockCoreV1Api.replaceNamespacedConfigMap).toHaveBeenCalledWith({
      body: {
        body: { metadata: { name: 'test-configmap' } },
        data: {
          state: '{"commitHash":"abc123","status":"succeeded","timestamp":"2025-05-15T10:00:00Z","trigger":"test"}',
        },
      },
      name: 'test-configmap',
      namespace: 'test-namespace',
    })
  })

  test('should handle errors when updating configmap', async () => {
    const generalError = new Error('Something went wrong')

    mockCoreV1Api.readNamespacedConfigMap.mockResolvedValue({
      body: { metadata: { name: testConfigMapName }, data: {} },
    })

    mockCoreV1Api.replaceNamespacedConfigMap.mockRejectedValue(generalError)

    await updateApplyState(testState, testNamespace, testConfigMapName)
  })

  test('should handle errors when creating configmap', async () => {
    const notFoundError = new Error('Not found')
    ;(notFoundError as any).response = { statusCode: 404 }

    mockCoreV1Api.readNamespacedConfigMap.mockRejectedValue(notFoundError)

    const createError = new Error('Failed to create ConfigMap')
    mockCoreV1Api.createNamespacedConfigMap.mockRejectedValue(createError)

    await updateApplyState(testState, testNamespace, testConfigMapName)
  })

  test('should handle unexpected errors when reading configmap', async () => {
    const unexpectedError = new Error('Unexpected error')
    ;(unexpectedError as any).response = { statusCode: 500 }

    mockCoreV1Api.readNamespacedConfigMap.mockRejectedValue(unexpectedError)

    await updateApplyState(testState, testNamespace, testConfigMapName)

    expect(mockCoreV1Api.createNamespacedConfigMap).not.toHaveBeenCalled()
  })
})
