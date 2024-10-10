import { CoreV1Api } from '@kubernetes/client-node'
import { jest } from '@jest/globals'
import { mock } from 'jest-mock-extended'
import * as k8s from './k8s'

describe('createGenericSecret', () => {
  const mockCoreV1Api = mock<CoreV1Api>()

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should create a secret with base64-encoded data', async () => {
    const name = 'test-secret'
    const namespace = 'default'
    const secretData = {
      username: 'admin',
      password: 'password123',
    }
    const encodedData = {
      username: 'YWRtaW4=', // base64 of 'admin'
      password: 'cGFzc3dvcmQxMjM=', // base64 of 'password123'
    }

    const mockResponse = { body: { metadata: { name, namespace }, data: encodedData } }
    // @ts-ignore
    mockCoreV1Api.createNamespacedSecret.mockResolvedValue(mockResponse)
    const result = await k8s.createGenericSecret(mockCoreV1Api, name, namespace, secretData)

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockCoreV1Api.createNamespacedSecret).toHaveBeenCalledWith(namespace, {
      metadata: { name, namespace },
      data: encodedData,
      type: 'Opaque',
    })

    expect(result).toEqual(mockResponse.body)
  })

  it('should throw an error if the secret creation fails', async () => {
    const name = 'test-secret'
    const namespace = 'default'
    const secretData = {
      username: 'admin',
      password: 'password123',
    }

    const errorMessage = 'Failed to create secret'
    mockCoreV1Api.createNamespacedSecret.mockRejectedValue(new Error(errorMessage))

    await expect(k8s.createGenericSecret(mockCoreV1Api, name, namespace, secretData)).rejects.toThrow(errorMessage)
  })
})
