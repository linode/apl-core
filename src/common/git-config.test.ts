import {
  getAuthUrlFromGitConfig,
  getGitCredentials,
  getOldGitCredentials,
  getStoredGitRepoConfig,
  setGitConfig,
} from './git-config'

const mockGetK8sSecret = jest.fn()
const mockCreateUpdateGenericSecret = jest.fn()
const mockGetK8sConfigMap = jest.fn()
const mockLoadYaml = jest.fn()
const mockCoreApi = {}

jest.mock('./k8s', () => ({
  getK8sSecret: (...args: any[]) => mockGetK8sSecret(...args),
  getK8sConfigMap: (...args: any[]) => mockGetK8sConfigMap(...args),
  createUpdateGenericSecret: (...args: any[]) => mockCreateUpdateGenericSecret(...args),
  k8s: { core: () => mockCoreApi },
}))

jest.mock('./debug', () => ({
  terminal: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

jest.mock('./envalid', () => ({
  env: {
    VALUES_INPUT: undefined,
    GIT_CONFIG_SECRET_NAME: 'apl-git-config',
    GIT_CONFIG_SECRET_NAMESPACE: 'apl-secrets',
  },
}))

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  loadYaml: (...args: any[]) => mockLoadYaml(...args),
}))

describe('git-config', () => {
  const mockedEnvalid = jest.requireMock('./envalid') as { env: { VALUES_INPUT: string | undefined } }
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    mockedEnvalid.env.VALUES_INPUT = undefined
    process.env = { ...originalEnv }
    delete process.env.NODE_ENV
    delete process.env.GIT_REPO_URL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getAuthUrlFromGitConfig', () => {
    it('should return undefined when repoUrl is missing', () => {
      expect(getAuthUrlFromGitConfig({ password: 'token' })).toBeUndefined()
    })

    it('should return undefined when password is missing', () => {
      expect(getAuthUrlFromGitConfig({ repoUrl: 'https://github.com/org/repo.git' })).toBeUndefined()
    })

    it('should return URL with username and password when username is provided', () => {
      const result = getAuthUrlFromGitConfig({
        repoUrl: 'https://github.com/org/repo.git',
        username: 'admin',
        password: 's3cret',
      })

      expect(result).toBe('https://admin:s3cret@github.com/org/repo.git')
    })

    it('should return token-only URL when username is not provided', () => {
      const result = getAuthUrlFromGitConfig({
        repoUrl: 'https://github.com/org/repo.git',
        password: 'token',
      })

      expect(result).toBe('https://token@github.com/org/repo.git')
    })

    it('should URL-encode special characters in username and password', () => {
      const result = getAuthUrlFromGitConfig({
        repoUrl: 'https://github.com/org/repo.git',
        username: 'user@org',
        password: 'p@ss:word/123',
      })

      expect(result).toBe('https://user%40org:p%40ss%3Aword%2F123@github.com/org/repo.git')
    })
  })

  describe('getGitCredentials', () => {
    it('should return credentials when secret exists', async () => {
      mockGetK8sSecret.mockResolvedValue({ username: 'admin', password: 's3cret' })
      const result = await getGitCredentials()
      expect(result).toEqual({ username: 'admin', password: 's3cret' })
      expect(mockGetK8sSecret).toHaveBeenCalledWith('apl-git-config', 'apl-secrets')
    })

    it('should return undefined when secret does not exist', async () => {
      mockGetK8sSecret.mockResolvedValue(undefined)
      const result = await getGitCredentials()
      expect(result).toBeUndefined()
    })

    it('should return credentials without username when username is missing', async () => {
      mockGetK8sSecret.mockResolvedValue({ password: 's3cret' })
      const result = await getGitCredentials()
      expect(result).toEqual({ username: undefined, password: 's3cret' })
    })

    it('should return undefined when password is missing', async () => {
      mockGetK8sSecret.mockResolvedValue({ username: 'admin' })
      const result = await getGitCredentials()
      expect(result).toBeUndefined()
    })
  })

  describe('getOldGitCredentials', () => {
    it('should return credentials from old argocd secret', async () => {
      mockGetK8sSecret.mockResolvedValue({
        url: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
        username: 'otomi-admin',
        password: 'oldpass',
      })
      mockGetK8sConfigMap.mockResolvedValue({ data: { GIT_BRANCH: 'develop' } })

      const result = await getOldGitCredentials()
      expect(result).toEqual({
        repoUrl: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
        username: 'otomi-admin',
        password: 'oldpass',
        branch: 'develop',
      })
      expect(mockGetK8sSecret).toHaveBeenCalledWith('argocd-repo-creds-git', 'argocd')
      expect(mockGetK8sConfigMap).toHaveBeenCalledWith('otomi', 'otomi-api', mockCoreApi)
    })

    it('should use default branch when configmap does not have GIT_BRANCH', async () => {
      mockGetK8sSecret.mockResolvedValue({
        url: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
        username: 'otomi-admin',
        password: 'oldpass',
      })
      mockGetK8sConfigMap.mockResolvedValue({ data: {} })

      const result = await getOldGitCredentials()
      expect(result?.branch).toBe('main')
    })

    it('should return undefined when secret does not exist', async () => {
      mockGetK8sSecret.mockResolvedValue(undefined)
      const result = await getOldGitCredentials()
      expect(result).toEqual(undefined)
    })

    it('should return undefined when password is missing', async () => {
      mockGetK8sSecret.mockResolvedValue({
        url: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
        username: 'otomi-admin',
      })
      const result = await getOldGitCredentials()
      expect(result).toEqual(undefined)
    })
  })

  describe('getStoredGitRepoConfig', () => {
    it('should use basic auth when username is provided', async () => {
      mockGetK8sSecret.mockResolvedValue({
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        username: 'admin',
        password: 's3cret',
      })

      const result = await getStoredGitRepoConfig()
      expect(result).toEqual({
        repoUrl: 'https://github.com/org/repo.git',
        authenticatedUrl: 'https://admin:s3cret@github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        username: 'admin',
        password: 's3cret',
      })
    })

    it('should use PAT auth (token only) when username is not provided', async () => {
      mockGetK8sSecret.mockResolvedValue({
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        password: 's3cret',
      })

      const result = await getStoredGitRepoConfig()
      expect(result).toEqual({
        repoUrl: 'https://github.com/org/repo.git',
        authenticatedUrl: 'https://s3cret@github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        username: undefined,
        password: 's3cret',
      })
    })

    it('should fall back to old credentials when both new secrets are missing', async () => {
      mockGetK8sSecret
        .mockResolvedValueOnce(undefined) // getGitCredentials (apl-git-credentials empty)
        .mockResolvedValueOnce({
          url: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
          username: 'otomi-admin',
          password: 'oldpass',
        }) // getOldGitCredentials
      mockGetK8sConfigMap.mockResolvedValueOnce({ data: {} }) // getOldGitCredentials

      const result = await getStoredGitRepoConfig()
      expect(result).toEqual({
        repoUrl: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
        authenticatedUrl: 'http://otomi-admin:oldpass@gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        username: 'otomi-admin',
        password: 'oldpass',
      })
    })

    it('should throw when no credentials are found at all', async () => {
      mockGetK8sSecret
        .mockResolvedValueOnce({
          repoUrl: 'https://github.com/org/repo.git',
          branch: 'main',
          email: 'test@test.com',
        }) // getGitCredentials - no password
        .mockResolvedValueOnce(undefined) // getOldGitCredentials returns undefined

      await expect(getStoredGitRepoConfig()).rejects.toThrow(
        'Git password/token not found in apl-git-config or gitea-credentials secret',
      )
    })

    it('should throw when repoUrl is empty', async () => {
      mockGetK8sSecret.mockResolvedValue({ repoUrl: '', username: 'admin', password: 's3cret' })

      await expect(getStoredGitRepoConfig()).rejects.toThrow('Git repository URL is empty')
    })

    it('should throw when branch is missing', async () => {
      mockGetK8sSecret.mockResolvedValue({ branch: '', username: 'admin', password: 's3cret' })

      await expect(getStoredGitRepoConfig()).rejects.toThrow('Git branch or email is empty')
    })

    it('should throw when email is empty', async () => {
      mockGetK8sSecret.mockResolvedValue({ email: '', username: 'admin', password: 's3cret' })

      await expect(getStoredGitRepoConfig()).rejects.toThrow('Git branch or email is empty')
    })

    it('should use GIT_REPO_URL env var in development mode', async () => {
      process.env.NODE_ENV = 'development'
      process.env.GIT_REPO_URL = 'http://localhost:3000/dev/repo.git'

      mockGetK8sSecret.mockResolvedValue({
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        username: 'admin',
        password: 's3cret',
      })

      const result = await getStoredGitRepoConfig()
      expect(result!.repoUrl).toBe('http://localhost:3000/dev/repo.git')
      expect(result!.authenticatedUrl).toBe('http://admin:s3cret@localhost:3000/dev/repo.git')
    })

    it('should URL-encode special characters in credentials', async () => {
      mockGetK8sConfigMap.mockResolvedValue({
        data: {
          repoUrl: 'https://github.com/org/repo.git',
          branch: 'main',
          email: 'pipeline@cluster.local',
        },
      })
      mockGetK8sSecret.mockResolvedValue({ username: 'user@org', password: 'p@ss:word/123' })

      const result = await getStoredGitRepoConfig()
      expect(result!.authenticatedUrl).toContain('user%40org')
      expect(result!.authenticatedUrl).toContain('p%40ss%3Aword%2F123')
    })
  })

  describe('setGitConfig', () => {
    it('should create secret with all fields', async () => {
      const config = await setGitConfig({
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'test@test.com',
        password: 'test-token',
      })

      expect(mockCreateUpdateGenericSecret).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-git-config',
        'apl-secrets',
        {
          repoUrl: 'https://github.com/org/repo.git',
          branch: 'main',
          email: 'test@test.com',
          password: 'test-token',
        },
        false,
      )
      expect(config).toEqual({
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'test@test.com',
        authenticatedUrl: 'https://test-token@github.com/org/repo.git',
        password: 'test-token',
      })
    })

    it('should only include defined fields', async () => {
      const config = await setGitConfig({
        repoUrl: 'https://github.com/org/repo.git',
        branch: '',
        username: undefined,
        password: 's3cret',
      })

      expect(mockCreateUpdateGenericSecret).toHaveBeenCalledWith(
        mockCoreApi,
        'apl-git-config',
        'apl-secrets',
        {
          repoUrl: 'https://github.com/org/repo.git',
          password: 's3cret',
        },
        false,
      )
      expect(config).toEqual({
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        authenticatedUrl: 'https://s3cret@github.com/org/repo.git',
        password: 's3cret',
      })
    })

    it('should use provided coreV1Api', async () => {
      const customApi = { custom: true } as any
      await setGitConfig({ branch: 'develop', password: 'test' }, customApi)

      expect(mockCreateUpdateGenericSecret).toHaveBeenCalledWith(
        customApi,
        'apl-git-config',
        'apl-secrets',
        {
          branch: 'develop',
          password: 'test',
        },
        false,
      )
    })

    it('should throw error if password is not set', async () => {
      await expect(setGitConfig({})).rejects.toThrow('Git password must be provided')
    })
  })
})
