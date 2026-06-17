import { getGitCredentials, getOldGitCredentials, getRepo, getStoredGitRepoConfig, setGitConfig } from './git-config'

const mockGetK8sSecret = jest.fn()
const mockCreateUpdateGenericSecret = jest.fn()
const mockGetK8sConfigMap = jest.fn()
const mockLoadYaml = jest.fn()
const mockCoreApi = {}

jest.mock('./k8s', () => ({
  getK8sSecret: (...args: any[]) => mockGetK8sSecret(...args),
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
  env: { VALUES_INPUT: undefined },
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
    it('should return credentials from old gitea-credentials secret', async () => {
      mockGetK8sSecret.mockResolvedValue({ GIT_USERNAME: 'otomi-admin', GIT_PASSWORD: 'oldpass' })
      const result = await getOldGitCredentials()
      expect(result).toEqual({
        repoUrl: 'http://gitea-http.gitea.svc.cluster.local:3000/otomi/values.git',
        username: 'otomi-admin',
        password: 'oldpass',
      })
      expect(mockGetK8sSecret).toHaveBeenCalledWith('gitea-credentials', 'apl-operator')
    })

    it('should return undefined when secret does not exist', async () => {
      mockGetK8sSecret.mockResolvedValue(undefined)
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
        .mockResolvedValueOnce({ GIT_USERNAME: 'otomi-admin', GIT_PASSWORD: 'oldpass' }) // getOldGitCredentials

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
      mockGetK8sSecret.mockResolvedValue({
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'test@test.com',
      }) // Partial insufficient data

      // getOldGitCredentials returns undefined
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

      expect(mockCreateUpdateGenericSecret).toHaveBeenCalledWith(mockCoreApi, 'apl-git-config', 'apl-secrets', {
        repoUrl: 'https://github.com/org/repo.git',
        branch: 'main',
        email: 'test@test.com',
        password: 'test-token',
      })
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

      expect(mockCreateUpdateGenericSecret).toHaveBeenCalledWith(mockCoreApi, 'apl-git-config', 'apl-secrets', {
        repoUrl: 'https://github.com/org/repo.git',
        password: 's3cret',
      })
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

      expect(mockCreateUpdateGenericSecret).toHaveBeenCalledWith(customApi, 'apl-git-config', 'apl-secrets', {
        branch: 'develop',
        password: 'test',
      })
    })

    it('should throw error if password is not set', async () => {
      await expect(setGitConfig({})).rejects.toThrow('Git password must be provided')
    })
  })

  describe('getRepo', () => {
    it('should use basic auth when username is provided', async () => {
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

    it('should use PAT auth (token only) when username is not provided', async () => {
      const values = {
        otomi: {
          git: {
            repoUrl: 'https://github.com/org/repo.git',
            password: 's3cret',
            branch: 'main',
            email: 'pipeline@cluster.local',
          },
        },
      }

      const result = await getRepo(values)
      expect(result).toEqual({
        repoUrl: 'https://github.com/org/repo.git',
        authenticatedUrl: 'https://s3cret@github.com/org/repo.git',
        branch: 'main',
        email: 'pipeline@cluster.local',
        username: undefined,
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
  })
})
