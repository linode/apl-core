import {
  getGitConfigData,
  getGitCredentials,
  getOldGitCredentials,
  getRepo,
  getStoredGitRepoConfig,
  setGitConfig,
} from './git-config'

const mockGetK8sSecret = jest.fn()
const mockGetK8sConfigMap = jest.fn()
const mockCreateUpdateConfigMap = jest.fn()
const mockCoreApi = {}

jest.mock('./k8s', () => ({
  getK8sSecret: (...args: any[]) => mockGetK8sSecret(...args),
  getK8sConfigMap: (...args: any[]) => mockGetK8sConfigMap(...args),
  createUpdateConfigMap: (...args: any[]) => mockCreateUpdateConfigMap(...args),
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

describe('git-config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.NODE_ENV
    delete process.env.GIT_REPO_URL
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getGitCredentials', () => {
    it('should return credentials when secret exists', async () => {
      mockGetK8sSecret.mockResolvedValue({ username: 'admin', password: 's3cret' })
      const result = await getGitCredentials()
      expect(result).toEqual({ username: 'admin', password: 's3cret' })
      expect(mockGetK8sSecret).toHaveBeenCalledWith('apl-git-credentials', 'apl-operator')
    })

    it('should return undefined when secret does not exist', async () => {
      mockGetK8sSecret.mockResolvedValue(undefined)
      const result = await getGitCredentials()
      expect(result).toBeUndefined()
    })

    it('should return undefined when username is missing', async () => {
      mockGetK8sSecret.mockResolvedValue({ password: 's3cret' })
      const result = await getGitCredentials()
      expect(result).toBeUndefined()
    })

    it('should return undefined when password is missing', async () => {
      mockGetK8sSecret.mockResolvedValue({ username: 'admin' })
      const result = await getGitCredentials()
      expect(result).toBeUndefined()
    })
  })

  describe('getOldGitCredentials', () => {
    it('should return credentials from old gitea-credentials secret', async () => {
      mockGetK8sSecret.mockResolvedValue({ GIT_USERNAME: 'otomi-admin', GIT_PASSWORD: 'oldpass' })
      const result = await getOldGitCredentials()
      expect(result).toEqual({ username: 'otomi-admin', password: 'oldpass' })
      expect(mockGetK8sSecret).toHaveBeenCalledWith('gitea-credentials', 'apl-operator')
    })

    it('should return undefined fields when secret does not exist', async () => {
      mockGetK8sSecret.mockResolvedValue(undefined)
      const result = await getOldGitCredentials()
      expect(result).toEqual({ username: undefined, password: undefined })
    })
  })

  describe('getGitConfigData', () => {
    it('should return config data from configmap', async () => {
      mockGetK8sConfigMap.mockResolvedValue({
        data: {
          repoUrl: 'https://github.com/org/repo.git',
          branch: 'main',
          email: 'pipeline@cluster.local',
        },
      })
      const result = await getGitConfigData()
      expect(result).toEqual({
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
      })
      expect(mockGetK8sConfigMap).toHaveBeenCalledWith('apl-operator', 'apl-git-config', mockCoreApi)
    })

    it('should return undefined when configmap does not exist', async () => {
      mockGetK8sConfigMap.mockResolvedValue(undefined)
      const result = await getGitConfigData()
      expect(result).toBeUndefined()
    })

    it('should return undefined when configmap has no data', async () => {
      mockGetK8sConfigMap.mockResolvedValue({ data: undefined })
      const result = await getGitConfigData()
      expect(result).toBeUndefined()
    })
  })

  describe('getStoredGitRepoConfig', () => {
    it('should return full config with authenticated URL', async () => {
      mockGetK8sConfigMap.mockResolvedValue({
        data: {
          repoUrl: 'https://github.com/org/repo.git',
          branch: 'main',
          email: 'pipeline@cluster.local',
        },
      })
      mockGetK8sSecret.mockResolvedValue({ username: 'admin', password: 's3cret' })

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

    it('should fall back to old credentials when new secret is missing', async () => {
      mockGetK8sConfigMap.mockResolvedValue({
        data: {
          repoUrl: 'https://github.com/org/repo.git',
          branch: 'main',
          email: 'pipeline@cluster.local',
        },
      })
      mockGetK8sSecret
        .mockResolvedValueOnce(undefined) // getGitCredentials
        .mockResolvedValueOnce({ GIT_USERNAME: 'otomi-admin', GIT_PASSWORD: 'oldpass' }) // getOldGitCredentials

      const result = await getStoredGitRepoConfig()
      expect(result).toEqual({
        repoUrl: 'https://github.com/org/repo.git',
        authenticatedUrl: 'https://otomi-admin:oldpass@github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        username: 'otomi-admin',
        password: 'oldpass',
      })
    })

    it('should fall back to default gitea config when configmap is missing', async () => {
      mockGetK8sConfigMap.mockResolvedValue(undefined)
      mockGetK8sSecret.mockResolvedValue({ username: 'admin', password: 's3cret' })

      const result = await getStoredGitRepoConfig()
      expect(result).toEqual({
        repoUrl: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
        authenticatedUrl: 'http://admin:s3cret@gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        username: 'admin',
        password: 's3cret',
      })
    })

    it('should throw when no credentials are found at all', async () => {
      mockGetK8sConfigMap.mockResolvedValue({
        data: { repoUrl: 'https://github.com/org/repo.git', branch: 'main', email: 'test@test.com' },
      })
      mockGetK8sSecret.mockResolvedValue(undefined) // both calls return undefined

      // getOldGitCredentials returns { username: undefined, password: undefined }
      // which passes the !credentials check but fails the !username || !password check
      await expect(getStoredGitRepoConfig()).rejects.toThrow(
        'Git credentials are incomplete in apl-git-credentials secret',
      )
    })

    it('should throw when repoUrl is missing', async () => {
      mockGetK8sConfigMap.mockResolvedValue({
        data: { branch: 'main', email: 'test@test.com' },
      })
      mockGetK8sSecret.mockResolvedValue({ username: 'admin', password: 's3cret' })

      await expect(getStoredGitRepoConfig()).rejects.toThrow('Git repository URL is missing')
    })

    it('should throw when branch is missing', async () => {
      mockGetK8sConfigMap.mockResolvedValue({
        data: { repoUrl: 'https://github.com/org/repo.git', email: 'test@test.com' },
      })
      mockGetK8sSecret.mockResolvedValue({ username: 'admin', password: 's3cret' })

      await expect(getStoredGitRepoConfig()).rejects.toThrow('Git branch or email is missing')
    })

    it('should throw when email is missing', async () => {
      mockGetK8sConfigMap.mockResolvedValue({
        data: { repoUrl: 'https://github.com/org/repo.git', branch: 'main' },
      })
      mockGetK8sSecret.mockResolvedValue({ username: 'admin', password: 's3cret' })

      await expect(getStoredGitRepoConfig()).rejects.toThrow('Git branch or email is missing')
    })

    it('should use GIT_REPO_URL env var in development mode', async () => {
      process.env.NODE_ENV = 'development'
      process.env.GIT_REPO_URL = 'http://localhost:3000/dev/repo.git'

      mockGetK8sConfigMap.mockResolvedValue({
        data: {
          repoUrl: 'https://github.com/org/repo.git',
          branch: 'main',
          email: 'pipeline@cluster.local',
        },
      })
      mockGetK8sSecret.mockResolvedValue({ username: 'admin', password: 's3cret' })

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
    it('should create configmap with all fields', async () => {
      await setGitConfig({
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'test@test.com',
      })

      expect(mockCreateUpdateConfigMap).toHaveBeenCalledWith(mockCoreApi, 'apl-git-config', 'apl-operator', {
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'test@test.com',
      })
    })

    it('should only include defined fields', async () => {
      await setGitConfig({ repoUrl: 'https://github.com/org/repo.git' })

      expect(mockCreateUpdateConfigMap).toHaveBeenCalledWith(mockCoreApi, 'apl-git-config', 'apl-operator', {
        repoUrl: 'https://github.com/org/repo.git',
      })
    })

    it('should use provided coreV1Api', async () => {
      const customApi = { custom: true } as any
      await setGitConfig({ branch: 'develop' }, customApi)

      expect(mockCreateUpdateConfigMap).toHaveBeenCalledWith(customApi, 'apl-git-config', 'apl-operator', {
        branch: 'develop',
      })
    })

    it('should pass empty data when no fields provided', async () => {
      await setGitConfig({})

      expect(mockCreateUpdateConfigMap).toHaveBeenCalledWith(mockCoreApi, 'apl-git-config', 'apl-operator', {})
    })
  })

  describe('getRepo', () => {
    it('should return full config from values', async () => {
      const values = {
        otomi: {
          git: {
            repoUrl: 'https://github.com/org/repo.git',
            username: 'admin',
            password: 's3cret',
            branch: 'main',
            email: 'pipeline@cluster.local',
          },
        },
      }

      const result = await getRepo(values)
      expect(result).toEqual({
        repoUrl: 'https://github.com/org/repo.git',
        authenticatedUrl: 'https://admin:s3cret@github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        username: 'admin',
        password: 's3cret',
      })
    })

    it('should throw when repoUrl is missing', async () => {
      await expect(getRepo({ otomi: { git: {} } })).rejects.toThrow('No otomi.git.repoUrl config was given.')
    })

    it('should throw when otomi.git is missing', async () => {
      await expect(getRepo({ otomi: {} })).rejects.toThrow('No otomi.git.repoUrl config was given.')
    })

    it('should throw when values is empty', async () => {
      await expect(getRepo({})).rejects.toThrow('No otomi.git.repoUrl config was given.')
    })

    it('should use GIT_REPO_URL env var in development mode', async () => {
      process.env.NODE_ENV = 'development'
      process.env.GIT_REPO_URL = 'http://localhost:3000/dev/repo.git'

      const values = {
        otomi: {
          git: {
            repoUrl: 'https://github.com/org/repo.git',
            username: 'admin',
            password: 's3cret',
            branch: 'main',
            email: 'pipeline@cluster.local',
          },
        },
      }

      const result = await getRepo(values)
      expect(result.repoUrl).toBe('http://localhost:3000/dev/repo.git')
      expect(result.authenticatedUrl).toBe('http://admin:s3cret@localhost:3000/dev/repo.git')
    })

    it('should fallback to K8s secret when password is a sealed placeholder', async () => {
      const secretMock = jest.fn().mockResolvedValue({ git_password: 'real-password' })
      const values = {
        otomi: {
          git: {
            repoUrl: 'https://github.com/org/repo.git',
            username: 'admin',
            password: 'sealed:apl-secrets/otomi-platform-secrets/git_password',
            branch: 'main',
            email: 'pipeline@cluster.local',
          },
        },
      }

      const result = await getRepo(values, { getK8sSecret: secretMock })
      expect(secretMock).toHaveBeenCalledWith('otomi-platform-secrets', 'apl-secrets')
      expect(result.password).toBe('real-password')
      expect(result.authenticatedUrl).toContain('real-password')
    })

    it('should fallback to K8s secret when password is empty', async () => {
      const secretMock = jest.fn().mockResolvedValue({ git_password: 'from-k8s' })
      const values = {
        otomi: {
          git: {
            repoUrl: 'https://github.com/org/repo.git',
            username: 'admin',
            password: '',
            branch: 'main',
            email: 'pipeline@cluster.local',
          },
        },
      }

      const result = await getRepo(values, { getK8sSecret: secretMock })
      expect(result.password).toBe('from-k8s')
    })

    it('should keep empty password when K8s secret also has no password', async () => {
      const secretMock = jest.fn().mockResolvedValue(null)
      const values = {
        otomi: {
          git: {
            repoUrl: 'https://github.com/org/repo.git',
            username: 'admin',
            password: '',
            branch: 'main',
            email: 'pipeline@cluster.local',
          },
        },
      }

      const result = await getRepo(values, { getK8sSecret: secretMock })
      expect(result.password).toBe('')
    })
  })
})
