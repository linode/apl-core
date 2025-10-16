import { getPrimaryPod, executePSQLScript, executePSQLOnPrimary } from './cloudnative-pg'
import * as k8s from '../k8s'
import { CustomObjectsApi, KubeConfig } from '@kubernetes/client-node'

describe('CloudnativePG Kubernetes API Functions', () => {
  let mockKubeConfig: jest.Mocked<KubeConfig>
  let mockCustomApi: jest.Mocked<CustomObjectsApi>
  let mockExec: jest.SpyInstance<Promise<k8s.ExecResult>>

  beforeEach(() => {
    jest.clearAllMocks()
    mockKubeConfig = new KubeConfig() as jest.Mocked<KubeConfig>
    mockKubeConfig.loadFromDefault = jest.fn()
    mockCustomApi = jest.mocked(k8s.k8s.custom(), { shallow: true }) as jest.Mocked<CustomObjectsApi>

    mockKubeConfig.makeApiClient = jest.fn().mockReturnValue(mockCustomApi)
    k8s.k8s.custom = jest.fn().mockReturnValue(mockCustomApi)
    mockExec = jest.spyOn(k8s, 'exec')
  })

  describe('getPrimaryPod', () => {
    it('should return the primary pod name from cluster status', async () => {
      const mockCluster = {
        apiVersion: 'postgresql.cnpg.io/v1',
        kind: 'Cluster',
        metadata: {
          name: 'test-cluster',
          namespace: 'default',
        },
        status: {
          currentPrimary: 'test-cluster-1',
          instances: 3,
          readyInstances: 3,
        },
      }

      mockCustomApi.getNamespacedCustomObject = jest.fn().mockResolvedValue(mockCluster)

      const result = await getPrimaryPod('default', 'test-cluster')

      expect(result).toBe('test-cluster-1')
      expect(mockCustomApi.getNamespacedCustomObject).toHaveBeenCalledWith({
        group: 'postgresql.cnpg.io',
        version: 'v1',
        plural: 'clusters',
        name: 'test-cluster',
        namespace: 'default',
      })
    })

    it('should throw error when no primary pod is found', async () => {
      const mockCluster = {
        apiVersion: 'postgresql.cnpg.io/v1',
        kind: 'Cluster',
        metadata: {
          name: 'test-cluster',
        },
        status: {
          instances: 3,
          readyInstances: 0,
        },
      }

      mockCustomApi.getNamespacedCustomObject = jest.fn().mockResolvedValue(mockCluster)

      await expect(getPrimaryPod('default', 'test-cluster')).rejects.toThrow(
        'No primary pod found for cluster test-cluster',
      )
    })

    it('should throw error when cluster does not exist', async () => {
      mockCustomApi.getNamespacedCustomObject = jest.fn().mockRejectedValue(new Error('Not found'))

      await expect(getPrimaryPod('nonexistent-cluster', 'default')).rejects.toThrow('Not found')
    })

    it('should handle cluster with no status', async () => {
      const mockCluster = {
        apiVersion: 'postgresql.cnpg.io/v1',
        kind: 'Cluster',
        metadata: {
          name: 'test-cluster',
        },
      }

      mockCustomApi.getNamespacedCustomObject = jest.fn().mockResolvedValue(mockCluster)

      await expect(getPrimaryPod('default', 'test-cluster')).rejects.toThrow(
        'No primary pod found for cluster test-cluster',
      )
    })
  })

  describe('executePSQLScript', () => {
    it('should execute psql command with correct parameters', async () => {
      const output = {
        stdout: 'output',
        stderr: 'error',
        exitCode: 1,
      }
      mockExec.mockResolvedValue(output)
      const result = await executePSQLScript('default', 'test-cluster-1', 'SELECT NOW();', 'mydb', 'myuser')

      expect(mockExec).toHaveBeenCalledWith('default', 'test-cluster-1', 'postgres', [
        'psql',
        '-U',
        'myuser',
        '-d',
        'mydb',
        '-c',
        'SELECT NOW();',
      ])
      expect(result).toBe(output)
    })

    it('should use default database and username if not provided', async () => {
      await executePSQLScript('default', 'test-cluster-1', 'SELECT 1;')

      expect(mockExec).toHaveBeenCalledWith('default', 'test-cluster-1', 'postgres', [
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-c',
        'SELECT 1;',
      ])
    })

    describe('executePSQLOnPrimary', () => {
      it('should get primary pod and execute script', async () => {
        const mockCluster = {
          apiVersion: 'postgresql.cnpg.io/v1',
          kind: 'Cluster',
          metadata: {
            name: 'test-cluster',
          },
          status: {
            currentPrimary: 'test-cluster-2',
          },
        }

        mockCustomApi.getNamespacedCustomObject = jest.fn().mockResolvedValue(mockCluster)

        const expectedOutput = 'CREATE DATABASE\n'
        mockExec.mockResolvedValue({
          stdout: expectedOutput,
          stderr: '',
          exitCode: 0,
        })

        const result = await executePSQLOnPrimary(
          'production',
          'test-cluster',
          'CREATE DATABASE testdb;',
          'postgres',
          'admin',
        )

        expect(mockCustomApi.getNamespacedCustomObject).toHaveBeenCalledWith({
          group: 'postgresql.cnpg.io',
          version: 'v1',
          plural: 'clusters',
          namespace: 'production',
          name: 'test-cluster',
        })

        expect(mockExec).toHaveBeenCalledWith('production', 'test-cluster-2', 'postgres', [
          'psql',
          '-U',
          'admin',
          '-d',
          'postgres',
          '-c',
          'CREATE DATABASE testdb;',
        ])

        expect(result.stdout).toBe(expectedOutput)
      })

      it('should propagate errors from getPrimaryPod', async () => {
        mockCustomApi.getNamespacedCustomObject = jest.fn().mockRejectedValue(new Error('Cluster not found'))

        await expect(executePSQLOnPrimary('default', 'nonexistent-cluster', 'SELECT 1;')).rejects.toThrow(
          'Cluster not found',
        )
      })

      it('should propagate errors from executePSQLScript', async () => {
        const mockCluster = {
          status: {
            currentPrimary: 'test-cluster-1',
          },
        }

        mockCustomApi.getNamespacedCustomObject = jest.fn().mockResolvedValue(mockCluster)
        mockExec.mockRejectedValue(new Error('Pod not ready'))

        await expect(executePSQLOnPrimary('test-cluster', 'default', 'SELECT 1;')).rejects.toThrow('Pod not ready')
      })
    })
  })
})
