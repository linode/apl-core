import type { CoreV1Api } from '@kubernetes/client-node'
import { APL_OPERATOR_NS, OTOMI_SECRETS, SEALED_SECRETS_NAMESPACE } from './constants'
import { terminal } from './debug'
import { env } from './envalid'
import { createUpdateConfigMap, getK8sConfigMap, getK8sSecret, k8s } from './k8s'
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
export const GIT_CONFIG_CONFIGMAP_NAME = 'apl-git-config'
export const GIT_CONFIG_SECRET_NAME = 'apl-git-credentials'
export const GIT_CONFIG_NAMESPACE = APL_OPERATOR_NS

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
  repoUrl?: string
  branch?: string
  email?: string
}

export interface GitCredentials {
  username?: string
  password: string
}

export async function getGitCredentials(): Promise<GitCredentials | undefined> {
  const secretData = await getK8sSecret(GIT_CONFIG_SECRET_NAME, GIT_CONFIG_NAMESPACE)

  if (!secretData?.password) {
    return undefined
  }

  // Reject unresolved sealed-secret placeholders (e.g. during first deploy before secrets are decrypted)
  if (typeof secretData.password === 'string' && secretData.password.startsWith('sealed:')) {
    return undefined
  }

  return {
    username: secretData.username,
    password: secretData.password,
  }
}
export async function getOldGitCredentials(): Promise<GitCredentials | undefined> {
  const secretData = await getK8sSecret('gitea-credentials', GIT_CONFIG_NAMESPACE)

  return {
    username: secretData?.GIT_USERNAME,
    password: secretData?.GIT_PASSWORD,
  }
}

export async function getGitConfigData(): Promise<GitConfigData | undefined> {
  const configMap = await getK8sConfigMap(GIT_CONFIG_NAMESPACE, GIT_CONFIG_CONFIGMAP_NAME, k8s.core())
  if (!configMap?.data) return undefined

  const { data } = configMap
  const config: GitConfigData = {
    repoUrl: data.repoUrl,
    branch: data.branch,
    email: data.email,
  }

  return config
}

/**
 * Reconstructs GitRepoConfig from stored ConfigMap + Secret.
 * This avoids calling hfValues() in operator startup path.
 */
export async function getStoredGitRepoConfig(): Promise<GitRepoConfig> {
  let [configData, credentials] = await Promise.all([getGitConfigData(), getGitCredentials()])

  // Try the canonical secret populated by SealedSecrets/ESO (same source as getRepo())
  // This covers the window after a git provider switch where apl-git-credentials is not yet
  // populated by ESO but otomi-secrets already has the real token.
  if (!credentials) {
    try {
      const otomiSecrets = await getK8sSecret(OTOMI_SECRETS, SEALED_SECRETS_NAMESPACE)
      if (otomiSecrets?.git_password) {
        credentials = {
          password: String(otomiSecrets.git_password),
        }
        d.info('Read git credentials from otomi-secrets')
      }
    } catch {
      d.debug('Could not read git credentials from otomi-secrets')
    }
  }

  //TODO This can be removed after BYO Git has been released
  if (!credentials) {
    credentials = await getOldGitCredentials()
  }

  // Deploy-time token takes priority over whatever is stored (may be stale after token rotation).
  const inputPassword = await getGitPasswordFromValuesInput()
  if (inputPassword) {
    credentials = { username: credentials?.username, password: inputPassword }
  }

  if (!credentials) {
    throw new Error(`Git password/token not found in ${GIT_CONFIG_SECRET_NAME} or gitea-credentials secret`)
  }

  // We cannot do hfValues because the env dir does not exist yet.
  //TODO This should be removed after BYO Git has been released.
  if (!configData) {
    configData = {
      repoUrl: 'http://git-server.git-server.svc.cluster.local/otomi/values.git',
      branch: 'main',
      email: 'pipeline@cluster.local',
    }
  }
  if (process.env.NODE_ENV === 'development') {
    configData.repoUrl = process.env.GIT_REPO_URL
  }
  const { username, password } = credentials
  const { branch, email, repoUrl } = configData

  if (!repoUrl) {
    throw new Error(`Git repository URL is missing in ${GIT_CONFIG_CONFIGMAP_NAME} config`)
  }
  if (!password) {
    throw new Error(`Git password/token is missing in ${GIT_CONFIG_SECRET_NAME} secret`)
  }
  if (!branch || !email) {
    throw new Error(`Git branch or email is missing in ${GIT_CONFIG_CONFIGMAP_NAME} config`)
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

  return { repoUrl, authenticatedUrl, branch, email, username, password } as GitRepoConfig
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
 * Password priority: deploy-time VALUES_INPUT > K8s secret (ESO/otomi-secrets) > resolved values.
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
    const valuesPassword = otomiGit?.password ?? ''
    if (valuesPassword && !(typeof valuesPassword === 'string' && valuesPassword.startsWith('sealed:'))) {
      password = valuesPassword
    }
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
