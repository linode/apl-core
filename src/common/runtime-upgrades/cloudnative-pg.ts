import { k8s, exec, ExecResult } from '../k8s'
import { V1ObjectMeta } from '@kubernetes/client-node'
import { OtomiDebugger } from '../debug'

/**
 * CloudnativePG cluster status interface
 */
interface ClusterStatus {
  currentPrimary?: string
  instances?: number
  readyInstances?: number
}

/**
 * CloudnativePG Cluster custom resource
 */
interface CNPGCluster {
  apiVersion: string
  kind: string
  metadata: V1ObjectMeta
  status?: ClusterStatus
}

/**
 * Get the primary pod from a CloudnativePG cluster
 *
 * @param namespace - Kubernetes namespace
 * @param name - Name of the CloudnativePG cluster
 * @returns The primary pod name
 */
export async function getPrimaryPod(namespace: string, name: string): Promise<string> {
  const cluster = (await k8s.custom().getNamespacedCustomObject({
    group: 'postgresql.cnpg.io',
    version: 'v1',
    plural: 'clusters',
    namespace,
    name,
  })) as CNPGCluster

  if (!cluster.status?.currentPrimary) {
    throw new Error(`No primary pod found for cluster ${name}`)
  }

  return cluster.status.currentPrimary
}

/**
 * Execute a PSQL script in the primary pod and captures output
 *
 * @param namespace - Kubernetes namespace
 * @param podName - Name of the pod to execute in
 * @param sqlScript - SQL script to execute
 * @param database - Database name (defaults to 'postgres')
 * @param username - PostgreSQL username (defaults to 'postgres')
 * @param timeout - Timeout before command is considered failed
 * @param psqlArgs - Additional arguments to pass to psql (optional)
 * @returns Execution result with stdout, stderr, and exit code*
 */
export async function executePSQLScript(
  namespace: string,
  podName: string,
  sqlScript: string,
  database: string = 'postgres',
  username: string = 'postgres',
  timeout: number = 30000,
  psqlArgs: string[] = [],
): Promise<ExecResult> {
  const command = ['psql', '-U', username, '-d', database, '-c', sqlScript, ...psqlArgs]
  return await exec(namespace, podName, 'postgres', command, timeout)
}

/**
 * Convenience function: Execute PSQL script on the primary pod of a cluster
 *
 * @param namespace - Kubernetes namespace
 * @param clusterName - Name of the CloudnativePG cluster
 * @param sqlScript - SQL script to execute
 * @param database - Database name
 * @param username - PostgreSQL username
 * @param timeout - Timeout before command is considered failed
 * @param psqlArgs - Additional arguments to pass to psql (optional)
 * @returns Execution result
 */
export async function executePSQLOnPrimary(
  namespace: string,
  clusterName: string,
  sqlScript: string,
  database: string = 'postgres',
  username: string = 'postgres',
  timeout: number = 30000,
  psqlArgs: string[] = [],
): Promise<ExecResult> {
  const primaryPod = await getPrimaryPod(namespace, clusterName)
  return await executePSQLScript(namespace, primaryPod, sqlScript, database, username, timeout, psqlArgs)
}
