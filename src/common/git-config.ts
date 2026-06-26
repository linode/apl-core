import type { CoreV1Api } from '@kubernetes/client-node'
import { generate as generatePassword } from 'generate-password'
import { $ } from 'zx'
import { terminal } from './debug'
import { env } from './envalid'
import { createUpdateGenericSecret, ensureNamespaceExists, getK8sSecret, k8s } from './k8s'
import { loadYaml } from './utils'
import { get } from 'lodash'

const d = terminal('common:git-config')

// Constants
export const GIT_SERVER_SECRET_NAME = 'git-server-credentials'
export const GIT_SERVER_NAMESPACE = 'git-server'
export const GIT_LEGACY_CONFIG = {
  repoUrl: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
}
export const GIT_DEFAULT_CONFIG = {
  repoUrl: 'http://git-server.git-server.svc.cluster.local/otomi/values.git',
  branch: 'main',
  email: 'pipeline@cluster.local',
}

/**
 * Unified Git repository configuration with credentials.
 * Contains both the base URL (without credentials) and the authenticated URL (with embedded credentials).
 * The authenticatedUrl uses token-only auth (password/token in URL username position, no password field),
 * which is the standard format for PAT/token-based git authentication.
 */
export interface GitRepoConfig {
  repoUrl: string // URL without credentials (e.g., https://github.com/org/repo.git)
  authenticatedUrl: string // URL with token-only auth: https://TOKEN@host/path
  branch: string
  email: string
  username?: string // Optional: only used for git commit author identity (git config user.name)
  password: string
}

export interface GitConfigData {
  repoUrl: string
  branch: string
  email: string
  username?: string
  password: string
  gitCloneCmd?: string
}

export async function getGitCredentials(): Promise<Partial<GitConfigData> | undefined> {
  const secretData = await getK8sSecret(env.GIT_CONFIG_SECRET_NAME, env.GIT_CONFIG_SECRET_NAMESPACE)

  // Need to contain the password for being useful
  if (!secretData?.password) {
    return undefined
  }

  return secretData as Partial<GitConfigData>
}

export async function getOldGitCredentials(): Promise<Partial<GitConfigData> | undefined> {
  let secretData = await getK8sSecret('gitea-credentials', 'apl-operator')
  if (secretData?.GIT_PASSWORD) {
    return {
      ...GIT_LEGACY_CONFIG,
      username: secretData.GIT_USERNAME,
      password: secretData.GIT_PASSWORD,
    }
  }
  secretData = await getK8sSecret('gitea-admin-secret', 'gitea')
  if (secretData?.password) {
    return {
      ...GIT_LEGACY_CONFIG,
      username: secretData.username,
      password: secretData.password,
    }
  }
  return undefined
}

export function getAuthUrlFromGitConfig(credentials: Partial<GitConfigData>): string | undefined {
  if (!credentials) {
    return undefined
  }
  const { repoUrl, username, password } = credentials
  if (!repoUrl || !password) {
    return undefined
  }
  const url = new URL(repoUrl)
  if (username) {
    url.username = username
    url.password = password
  } else {
    url.username = password
    url.password = ''
  }
  return url.toString()
}

export function createRepoConfig(data: Partial<GitConfigData>, preferInternal = false): GitRepoConfig {
  const credentials: Partial<GitConfigData> = {
    ...GIT_DEFAULT_CONFIG,
    ...data,
  }
  if ([GIT_DEFAULT_CONFIG.repoUrl, GIT_LEGACY_CONFIG.repoUrl].includes(credentials.repoUrl!) && !credentials.username) {
    // On legacy (Gitea) and default configurations, assume otomi-admin login
    credentials.username = 'otomi-admin'
  }

  if (process.env.NODE_ENV === 'development' && !preferInternal && process.env.GIT_REPO_URL) {
    credentials.repoUrl = process.env.GIT_REPO_URL
  }

  if (!credentials.repoUrl) {
    throw new Error(`Git repository URL is empty in ${env.GIT_CONFIG_SECRET_NAME} secret`)
  }
  if (!credentials.password) {
    throw new Error(`Git password/token is empty in ${env.GIT_CONFIG_SECRET_NAME} secret`)
  }
  if (!credentials.branch || !credentials.email) {
    throw new Error(`Git branch or email is empty in ${env.GIT_CONFIG_SECRET_NAME} secret`)
  }

  const authenticatedUrl = getAuthUrlFromGitConfig(credentials) // Validate URL and credentials, but ignore the result since we reconstruct it below

  credentials.repoUrl = credentials.repoUrl.trim()
  return { ...credentials, authenticatedUrl } as GitRepoConfig
}

/**
 * Reconstructs GitRepoConfig from stored ConfigMap + Secret.
 * This avoids calling hfValues() in operator startup path.
 */
export async function getStoredGitRepoConfig(preferInternal = false): Promise<GitRepoConfig> {
  let credentials = await getGitCredentials()
  if (!credentials) {
    d.debug('Could not read git credentials from apl-secrets')
    // Fallback before migration
    credentials = await getOldGitCredentials()
    if (credentials) {
      d.debug('Fallback credentials read for Gitea')
    }
  }
  if (!credentials) {
    throw new Error(`Git password/token not found in ${env.GIT_CONFIG_SECRET_NAME} or gitea-credentials secret`)
  }
  return createRepoConfig(credentials, preferInternal)
}

/**
 * Reads provided Git configuration from VALUES_INPUT. If not provided, checks for config
 * stored earlier in the cluster. If none is given, generates a new Git password.
 * To be used in initialization phase of the Operator only, where the Secret may not
 * yet exist.
 */
export async function getInitialGitConfig(): Promise<{ config: Record<string, any>; isInitial: boolean }> {
  const inputValues = (await loadYaml(env.VALUES_INPUT, { noError: true })) as Record<string, any>
  if (inputValues && inputValues.otomi?.git?.password) {
    d.info('Using Git credentials from VALUES_INPUT')
    return { config: inputValues.otomi.git, isInitial: true }
  }
  if (process.env.NODE_ENV !== 'test') {
    // In test / CI environment, do not retrieve from cluster
    const storedValues = await getGitCredentials()
    if (storedValues) {
      d.info('Using Git credentials from apl-secrets namespace')
      return { config: storedValues, isInitial: false }
    }
    const oldCredentials = await getOldGitCredentials()
    if (oldCredentials) {
      d.info('Using Gitea credentials')
      return { config: oldCredentials, isInitial: false }
    }
  }
  d.info('Git credentials not set. Generating.')
  const initialPassword = generatePassword({
    length: 24,
    numbers: true,
    symbols: '!@#$%&*',
    strict: true,
  })
  const defaultConfig: GitConfigData = {
    ...GIT_DEFAULT_CONFIG,
    username: 'otomi-admin',
    password: initialPassword,
  }
  const domainSuffix = get(inputValues, 'cluster.domainSuffix')
  const publicRepoUrl = `https://git.${domainSuffix}/otomi/values.git`
  defaultConfig.gitCloneCmd = getAuthUrlFromGitConfig({ ...defaultConfig, repoUrl: publicRepoUrl })

  return {
    config: defaultConfig,
    isInitial: true,
  }
}

/**
 * Creates the Git Server config for an initial installation
 */
export async function setGitServerConfig(config: GitRepoConfig): Promise<void> {
  const api = k8s.core()
  const { username, password } = config
  const htpasswd = (await $`htpasswd -nbB ${username} ${password}`).stdout.trim()
  await ensureNamespaceExists(GIT_SERVER_NAMESPACE)
  await createUpdateGenericSecret(api, GIT_SERVER_SECRET_NAME, GIT_SERVER_NAMESPACE, { htpasswd }, false)
}

/**
 * Creates or updates the Git configuration Secret
 */
export async function setGitConfig(config: Record<string, any>, coreV1Api?: CoreV1Api): Promise<GitRepoConfig> {
  const api = coreV1Api ?? k8s.core()

  const secretData: Partial<GitConfigData> = {}
  // Extract data in valid fields that has non-empty values input
  for (const fieldName of ['repoUrl', 'gitCloneCmd', 'branch', 'email', 'username', 'password']) {
    if (config[fieldName]) {
      secretData[fieldName] = String(config[fieldName])
    }
  }
  if (!secretData.password) {
    throw new Error('Git password must be provided')
  }

  await createUpdateGenericSecret(api, env.GIT_CONFIG_SECRET_NAME, env.GIT_CONFIG_SECRET_NAMESPACE, secretData, false)
  return createRepoConfig(secretData)
}
