import type { CoreV1Api } from '@kubernetes/client-node'
import { OTOMI_SECRETS, SEALED_SECRETS_NAMESPACE } from './constants'
import { terminal } from './debug'
import { env } from './envalid'
import { createUpdateGenericSecret, getK8sSecret, k8s } from './k8s'
import { loadYaml } from './utils'

const d = terminal('common:git-config')

// Returns the plaintext git password from VALUES_INPUT, or undefined if absent/missing.
async function getGitPasswordFromValuesInput(): Promise<string | undefined> {
  if (!env.VALUES_INPUT) return undefined
  try {
    const inputValues = (await loadYaml(env.VALUES_INPUT)) as Record<string, any>
    const password = String(inputValues?.otomi?.git?.password ?? '')
    return password || undefined
  } catch {
    return undefined
  }
}

// Constants
export const GIT_CONFIG_SECRET_NAME = 'apl-git-config'
export const GIT_CONFIG_NAMESPACE = 'apl-secrets'
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
}

export async function getGitCredentials(): Promise<Partial<GitConfigData> | undefined> {
  const secretData = await getK8sSecret(GIT_CONFIG_SECRET_NAME, GIT_CONFIG_NAMESPACE)

  // Need to contain the password for being useful
  if (!secretData?.password) {
    return undefined
  }

  return secretData as Partial<GitConfigData>
}

export async function getOldGitCredentials(): Promise<Partial<GitConfigData> | undefined> {
  const secretData = await getK8sSecret('gitea-credentials', 'apl-operator')
  if (!secretData || !secretData?.GIT_PASSWORD) return undefined

  return {
    ...GIT_LEGACY_CONFIG,
    username: secretData?.GIT_USERNAME,
    password: secretData?.GIT_PASSWORD,
  }
}

export function createRepoConfig(data: Partial<GitConfigData>, preferInternal = false): GitRepoConfig {
  const credentials = {
    ...GIT_DEFAULT_CONFIG,
    ...data,
  }
  if ([GIT_DEFAULT_CONFIG.repoUrl, GIT_LEGACY_CONFIG.repoUrl].includes(credentials.repoUrl) && !credentials.username) {
    // On legacy (Gitea) and default configurations, assume otomi-admin login
    credentials.username = 'otomi-admin'
  }

  const { branch, email, username, password } = credentials
  let { repoUrl } = credentials
  if (process.env.NODE_ENV === 'development' && !preferInternal && process.env.GIT_REPO_URL) {
    repoUrl = process.env.GIT_REPO_URL
  }

  if (!repoUrl) {
    throw new Error(`Git repository URL is empty in ${GIT_CONFIG_SECRET_NAME} secret`)
  }
  if (!password) {
    throw new Error(`Git password/token is empty in ${GIT_CONFIG_SECRET_NAME} secret`)
  }
  if (!branch || !email) {
    throw new Error(`Git branch or email is empty in ${GIT_CONFIG_SECRET_NAME} secret`)
  }
  const url = new URL(repoUrl)
  if (username) {
    url.username = username
    url.password = password
  } else {
    url.username = password
    url.password = ''
  }
  const authenticatedUrl = url.toString()

  return { ...credentials, repoUrl, authenticatedUrl } as GitRepoConfig
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
    throw new Error(`Git password/token not found in ${GIT_CONFIG_SECRET_NAME} or gitea-credentials secret`)
  }
  return createRepoConfig(credentials, preferInternal)
}

/**
 * Creates or updates the Git configuration ConfigMap
 */
export async function setGitConfig(config: Record<string, any>, coreV1Api?: CoreV1Api): Promise<GitRepoConfig> {
  const api = coreV1Api ?? k8s.core()

  const secretData: Partial<GitConfigData> = {}
  // Extract data in valid fields that has non-empty values input
  for (const fieldName of ['repoUrl', 'branch', 'email', 'username', 'password']) {
    if (config[fieldName]) {
      secretData[fieldName] = String(config[fieldName])
    }
  }
  if (!secretData.password) {
    throw new Error('Git password must be provided')
  }

  await createUpdateGenericSecret(api, GIT_CONFIG_SECRET_NAME, GIT_CONFIG_NAMESPACE, secretData)
  return createRepoConfig(secretData)
}

/**
 * Gets repository configuration from values, constructing the authenticated URL with embedded credentials.
 * Password priority: deploy-time VALUES_INPUT > K8s secret (otomi-secrets via ESO) > values fallback.
 * Secrets are stripped from disk values by stripAllSecrets() — the values fallback exists only for
 * edge cases (e.g. non-secret git passwords set explicitly in values).
 */
export const getRepo = async (values: Record<string, any>, deps = { getK8sSecret }): Promise<GitRepoConfig> => {
  const otomiGit = values?.otomi?.git

  if (!otomiGit?.repoUrl) {
    throw new Error('No otomi.git.repoUrl config was given.')
  }
  if (process.env.NODE_ENV === 'development') {
    otomiGit.repoUrl = process.env.GIT_REPO_URL
  }
  const username: string | undefined = otomiGit?.username
  let password = ''
  const email = otomiGit?.email
  const branch = otomiGit?.branch

  // Deploy-time token takes priority; fall back to K8s secret, then resolved values.
  password = (await getGitPasswordFromValuesInput()) ?? ''

  if (!password) {
    try {
      const secret = await deps.getK8sSecret(OTOMI_SECRETS, SEALED_SECRETS_NAMESPACE)
      if (secret?.git_password) {
        password = String(secret.git_password)
        d.debug('Read git password from K8s secret (ESO)')
      }
    } catch {
      d.debug('Could not read git password from K8s secret')
    }
  }

  if (!password) {
    password = otomiGit?.password ?? ''
  }

  const repoUrl = otomiGit?.repoUrl as string
  const url = new URL(repoUrl)
  if (username) {
    url.username = username
    url.password = password
  } else {
    url.username = password
    url.password = ''
  }
  const authenticatedUrl = url.toString()

  return { repoUrl, authenticatedUrl, branch, email, username, password } as GitRepoConfig
}
