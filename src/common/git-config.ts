import { terminal } from './debug'
import { createUpdateConfigMap, getK8sConfigMap, getK8sSecret, k8s } from './k8s'
import type { CoreV1Api } from '@kubernetes/client-node'

const d = terminal('common:git-config')

// Constants
export const GIT_CONFIG_CONFIGMAP_NAME = 'apl-git-config'
export const GIT_CONFIG_SECRET_NAME = 'apl-git-credentials'
export const GIT_CONFIG_NAMESPACE = 'apl-operator'

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

export interface GitConfigData {
  repoUrl?: string
  branch?: string
  email?: string
}

export interface GitCredentials {
  username: string
  password: string
}

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

export async function getGitConfigData(): Promise<GitConfigData | undefined> {
  const configMap = await getK8sConfigMap(GIT_CONFIG_NAMESPACE, GIT_CONFIG_CONFIGMAP_NAME, k8s.core())
  if (!configMap?.data) return undefined

  const { data } = configMap
  return {
    repoUrl: data.repoUrl,
    branch: data.branch,
    email: data.email,
  }
}

/**
 * Reconstructs GitRepoConfig from stored ConfigMap + Secret.
 * This avoids calling hfValues() in operator startup path.
 */
export async function getStoredGitRepoConfig(): Promise<GitRepoConfig | undefined> {
  const [configData, credentials] = await Promise.all([getGitConfigData(), getGitCredentials()])

  if (!configData || !credentials) {
    return undefined
  }

  const { username, password } = credentials
  const { branch, email, repoUrl } = configData

  if (!repoUrl) {
    throw new Error(`Git repository URL is missing in ${GIT_CONFIG_CONFIGMAP_NAME} config`)
  }
  if (!username || !password) {
    throw new Error(`Git credentials are incomplete in ${GIT_CONFIG_SECRET_NAME} secret`)
  }
  if (!branch || !email) {
    throw new Error(`Git branch or email is missing in ${GIT_CONFIG_CONFIGMAP_NAME} config`)
  }
  const url = new URL(repoUrl)
  url.username = username
  url.password = password
  const authenticatedUrl = url.toString()

  return { repoUrl, authenticatedUrl, branch, email, username, password }
}

/**
 * Creates or updates the Git configuration ConfigMap
 */
export async function setGitConfig(config: Partial<GitConfigData>, coreV1Api?: CoreV1Api): Promise<void> {
  const api = coreV1Api ?? k8s.core()

  const data: Record<string, string> = {}

  if (config.repoUrl !== undefined) data.repoUrl = config.repoUrl
  if (config.branch !== undefined) data.branch = config.branch
  if (config.email !== undefined) data.email = config.email

  await createUpdateConfigMap(api, GIT_CONFIG_CONFIGMAP_NAME, GIT_CONFIG_NAMESPACE, data)
}

/**
 * Gets repository configuration from values, constructing the authenticated URL with embedded credentials.
 */
export const getRepo = (values: Record<string, any>): GitRepoConfig => {
  const otomiGit = values?.otomi?.git

  if (!otomiGit?.repoUrl) {
    throw new Error('No otomi.git.repoUrl config was given.')
  }

  const username = otomiGit?.user
  const password = otomiGit?.password
  const email = otomiGit?.email
  const branch = otomiGit?.branch

  const repoUrl = otomiGit?.repoUrl as string
  const url = new URL(repoUrl)
  url.username = username
  url.password = password
  const authenticatedUrl = url.toString()

  return { repoUrl, authenticatedUrl, branch, email, username, password }
}
