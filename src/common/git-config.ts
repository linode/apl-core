import { terminal } from './debug'
import { createUpdateConfigMap, createUpdateGenericSecret, getK8sSecret, k8s } from './k8s'
import type { CoreV1Api } from '@kubernetes/client-node'

const d = terminal('common:git-config')

// Constants
export const GIT_CONFIG_CONFIGMAP_NAME = 'apl-git-config'
export const GIT_CONFIG_SECRET_NAME = 'apl-git-credentials'
export const GIT_CONFIG_NAMESPACE = 'apl-operator'

// Types
export interface GitConfigData {
  useInternalGitea: boolean
  repoUrl?: string
  branch?: string
  email?: string
  lastUpdated?: string
}

export interface GitCredentials {
  username: string
  password: string
}

/**
 * Reads the Git configuration from the ConfigMap
 */
export async function getGitConfig(coreV1Api?: CoreV1Api): Promise<GitConfigData | undefined> {
  const api = coreV1Api ?? k8s.core()
  try {
    const configMap = await api.readNamespacedConfigMap({
      name: GIT_CONFIG_CONFIGMAP_NAME,
      namespace: GIT_CONFIG_NAMESPACE,
    })

    if (!configMap?.data) {
      return undefined
    }

    // Support both old 'provider' field and new 'useInternalGitea' field for backwards compatibility
    let useInternalGitea = true
    if (configMap.data.useInternalGitea !== undefined) {
      useInternalGitea = configMap.data.useInternalGitea === 'true'
    } else if (configMap.data.provider !== undefined) {
      // Backwards compatibility: provider 'external' means useInternalGitea=false
      useInternalGitea = configMap.data.provider !== 'external'
    }

    return {
      useInternalGitea,
      repoUrl: configMap.data.repoUrl || undefined,
      branch: configMap.data.branch || undefined,
      email: configMap.data.email || undefined,
      lastUpdated: configMap.data.lastUpdated || undefined,
    }
  } catch (error: any) {
    if (error.code === 404) {
      return undefined
    }
    throw error
  }
}

/**
 * Reads the Git credentials from the Secret
 */
export async function getGitCredentials(): Promise<GitCredentials | undefined> {
  const secretData = await getK8sSecret(GIT_CONFIG_SECRET_NAME, GIT_CONFIG_NAMESPACE)

  if (!secretData?.username || !secretData?.password) {
    return undefined
  }

  return {
    username: secretData.username,
    password: secretData.password,
  }
}

/**
 * Creates or updates the Git configuration ConfigMap
 */
export async function setGitConfig(config: Partial<GitConfigData>, coreV1Api?: CoreV1Api): Promise<void> {
  const api = coreV1Api ?? k8s.core()

  const data: Record<string, string> = {
    lastUpdated: new Date().toISOString(),
  }

  if (config.useInternalGitea !== undefined) data.useInternalGitea = String(config.useInternalGitea)
  if (config.repoUrl !== undefined) data.repoUrl = config.repoUrl
  if (config.branch !== undefined) data.branch = config.branch
  if (config.email !== undefined) data.email = config.email

  await createUpdateConfigMap(api, GIT_CONFIG_CONFIGMAP_NAME, GIT_CONFIG_NAMESPACE, data)
  d.info(`Updated Git config: useInternalGitea=${config.useInternalGitea}`)
}

/**
 * Creates or updates the Git credentials Secret
 */
export async function setGitCredentials(credentials: GitCredentials, coreV1Api?: CoreV1Api): Promise<void> {
  const api = coreV1Api ?? k8s.core()

  await createUpdateGenericSecret(api, GIT_CONFIG_SECRET_NAME, GIT_CONFIG_NAMESPACE, {
    username: credentials.username,
    password: credentials.password,
  })
  d.info('Updated Git credentials secret')
}

/**
 * Gets the useInternalGitea setting from values, with fallback to true
 */
export function getUseInternalGiteaFromValues(values: Record<string, any>): boolean {
  return values?.otomi?.git?.useInternalGitea ?? true
}

/**
 * Checks if external Git is configured (i.e., not using internal Gitea)
 */
export function isExternalGit(values: Record<string, any>): boolean {
  return !getUseInternalGiteaFromValues(values)
}
