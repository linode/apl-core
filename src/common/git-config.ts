import { terminal } from './debug'
import { env } from './envalid'
import { createUpdateConfigMap, getK8sSecret, k8s } from './k8s'
import type { CoreV1Api } from '@kubernetes/client-node'

const d = terminal('common:git-config')

// Constants
export const GIT_CONFIG_CONFIGMAP_NAME = 'apl-git-config'
export const GIT_CONFIG_SECRET_NAME = 'apl-git-credentials'
export const GIT_CONFIG_NAMESPACE = 'apl-operator'

// Types

/**
 * Unified Git repository configuration with credentials.
 * Contains both the base URL (without credentials) and the authenticated URL (with embedded credentials).
 */
export interface GitRepoConfig {
  repoUrl: string // URL without credentials (e.g., https://github.com/org/repo.git)
  authenticatedUrl: string // URL with embedded credentials for git operations
  branch: string
  email: string
  username: string
  password: string
}

/**
 * Git configuration data stored in ConfigMap (non-sensitive data only).
 */
export interface GitConfigData {
  useInternalGitea: boolean
  repoUrl?: string
  branch?: string
  email?: string
  lastUpdated?: string
}

/**
 * Git credentials stored in Secret.
 */
export interface GitCredentials {
  username: string
  password: string
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
 * Gets the useInternalGitea setting from values, with fallback to true
 */
export function getUseInternalGiteaFromValues(values: Record<string, any>): boolean {
  return values?.otomi?.git?.useInternalGitea ?? true
}

/**
 * Gets repository configuration from values, constructing the authenticated URL with embedded credentials.
 * Works for both internal Gitea and external Git providers.
 */
export const getRepo = (values: Record<string, any>): GitRepoConfig => {
  const useInternalGitea = values?.otomi?.git?.useInternalGitea ?? true
  const otomiGit = values?.otomi?.git

  if (!useInternalGitea && !otomiGit?.repoUrl) {
    throw new Error('External Git selected (useInternalGitea=false) but no otomi.git.repoUrl config was given.')
  }

  const username = otomiGit?.user
  const password = otomiGit?.password
  const email = otomiGit?.email
  const branch = otomiGit?.branch ?? 'main'

  let repoUrl: string
  let authenticatedUrl: string

  if (useInternalGitea) {
    // Internal Gitea - construct URLs from environment variables
    const gitUrl = env.GIT_URL
    const gitPort = env.GIT_PORT
    const gitOrg = 'otomi'
    const gitRepo = 'values'
    const protocol = env.GIT_PROTOCOL
    repoUrl = `${protocol}://${gitUrl}:${gitPort}/${gitOrg}/${gitRepo}.git`
    authenticatedUrl = `${protocol}://${username}:${encodeURIComponent(password as string)}@${gitUrl}:${gitPort}/${gitOrg}/${gitRepo}.git`
  } else {
    // External Git - use provided repoUrl and embed credentials
    repoUrl = otomiGit?.repoUrl
    const url = new URL(repoUrl)
    url.username = username
    url.password = password
    authenticatedUrl = url.toString()
  }

  return { repoUrl, authenticatedUrl, branch, email, username, password }
}
