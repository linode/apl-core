import { GitRepository, GitRepositoryConfig } from './git-repository'
import { OperatorError } from './errors'

jest.mock('simple-git', () => {
  const mockGit = {
    clone: jest.fn(),
    log: jest.fn(),
    pull: jest.fn(),
    diff: jest.fn(),
    clean: jest.fn(),
    getRemotes: jest.fn(),
    remote: jest.fn(),
  }
  return jest.fn().mockImplementation(() => mockGit)
})

jest.mock('../common/debug', () => ({
  terminal: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}))

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}))

describe('GitRepository', () => {
  let mockGit
  let gitRepository: GitRepository
  let defaultConfig: GitRepositoryConfig

  beforeEach(() => {
    jest.clearAllMocks()

    defaultConfig = {
      username: 'testuser',
      password: 'testpass',
      gitHost: 'github.com',
      gitPort: '443',
      gitProtocol: 'https',
      repoPath: '/tmp/repo',
      gitOrg: 'testorg',
      gitRepo: 'testrepo',
    }

    const simpleGit = require('simple-git')
    mockGit = simpleGit()
    mockGit.clean.mockResolvedValue(undefined)

    gitRepository = new GitRepository(defaultConfig)
  })

  describe('constructor', () => {
    test('should create repository URL correctly', () => {
      expect(gitRepository.repoUrl).toBe('https://testuser:testpass@github.com:443/testorg/testrepo.git')
    })

    test('should URL encode password with special characters', () => {
      const configWithSpecialChars = {
        ...defaultConfig,
        password: 'test@pass#123',
      }
      const repo = new GitRepository(configWithSpecialChars)
      expect(repo.repoUrl).toBe('https://testuser:test%40pass%23123@github.com:443/testorg/testrepo.git')
    })
  })

  describe('setLastRevision', () => {
    test('should return true when repository has commits', async () => {
      mockGit.log.mockResolvedValue({
        latest: { hash: 'abc123' },
        total: 5,
        all: [],
      })

      await gitRepository.setLastRevision()

      expect('abc123').toBe(gitRepository.lastRevision)
      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 1 })
    })

    test('should return false when repository has no commits', async () => {
      mockGit.log.mockResolvedValue({
        latest: undefined,
        total: 0,
        all: [],
      })

      await gitRepository.setLastRevision()

      expect(gitRepository.lastRevision).toBe('')
      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 1 })
    })

    test('should throw error when git command fails', async () => {
      const error = new Error('Git error')
      mockGit.log.mockRejectedValue(error)

      await expect(gitRepository.setLastRevision()).rejects.toThrow(error)
      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 1 })
    })
  })

  describe('waitForCommits', () => {
    test('should retry until hasCommits returns true', async () => {
      const setLastRevisionSpy = jest.spyOn(gitRepository, 'setLastRevision')
      mockGit.pull.mockResolvedValue({})
      setLastRevisionSpy.mockRejectedValueOnce(new Error('No commits yet')).mockResolvedValueOnce()

      await gitRepository.waitForCommits(2, 100)

      expect(mockGit.pull).toHaveBeenCalledTimes(2)
      expect(setLastRevisionSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('clone', () => {
    const fs = require('fs')

    beforeEach(() => {
      fs.existsSync.mockReturnValue(false)
    })

    test('should clone repository successfully when repo does not exist', async () => {
      mockGit.clone.mockResolvedValue(undefined)

      mockGit.log.mockResolvedValue({
        latest: { hash: 'abc123' },
        total: 1,
        all: [],
      })

      await gitRepository.clone()

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://testuser:testpass@github.com:443/testorg/testrepo.git',
        '/tmp/repo',
      )
      expect(fs.existsSync).toHaveBeenCalledWith('/tmp/repo/.git')
    })

    test('should handle clone failure', async () => {
      const error = new Error('Clone failed')
      mockGit.clone.mockRejectedValue(error)

      await expect(gitRepository.clone()).rejects.toBeInstanceOf(OperatorError)
      expect(mockGit.clone).toHaveBeenCalled()
    })

    test('should skip clone and verify origin when repo already exists with correct origin', async () => {
      fs.existsSync.mockReturnValue(true)
      mockGit.getRemotes.mockResolvedValue([
        {
          name: 'origin',
          refs: {
            fetch: 'https://testuser:testpass@github.com:443/testorg/testrepo.git',
            push: 'https://testuser:testpass@github.com:443/testorg/testrepo.git',
          },
        },
      ])

      await gitRepository.clone()

      expect(fs.existsSync).toHaveBeenCalledWith('/tmp/repo/.git')
      expect(mockGit.clone).not.toHaveBeenCalled()
      expect(mockGit.getRemotes).toHaveBeenCalledWith(true)
      expect(mockGit.remote).not.toHaveBeenCalled()
    })

    test('should reset origin when repo exists with incorrect origin URL', async () => {
      fs.existsSync.mockReturnValue(true)
      mockGit.getRemotes.mockResolvedValue([
        {
          name: 'origin',
          refs: {
            fetch: 'https://testuser:wrongpass@github.com:443/testorg/testrepo.git',
            push: 'https://testuser:wrongpass@github.com:443/testorg/testrepo.git',
          },
        },
      ])
      mockGit.remote.mockResolvedValue(undefined)

      await gitRepository.clone()

      expect(mockGit.getRemotes).toHaveBeenCalledWith(true)
      expect(mockGit.remote).toHaveBeenCalledWith([
        'set-url',
        'origin',
        'https://testuser:testpass@github.com:443/testorg/testrepo.git',
      ])
      expect(mockGit.clone).not.toHaveBeenCalled()
    })

    test('should add origin when repo exists but origin is missing', async () => {
      fs.existsSync.mockReturnValue(true)
      mockGit.getRemotes.mockResolvedValue([])
      mockGit.remote.mockResolvedValue(undefined)

      await gitRepository.clone()

      expect(mockGit.getRemotes).toHaveBeenCalledWith(true)
      expect(mockGit.remote).toHaveBeenCalledWith([
        'add',
        'origin',
        'https://testuser:testpass@github.com:443/testorg/testrepo.git',
      ])
      expect(mockGit.clone).not.toHaveBeenCalled()
    })

    test('should throw error when origin verification fails', async () => {
      fs.existsSync.mockReturnValue(true)
      const error = new Error('Git command failed')
      mockGit.getRemotes.mockRejectedValue(error)

      await expect(gitRepository.clone()).rejects.toBeInstanceOf(OperatorError)
      expect(mockGit.getRemotes).toHaveBeenCalled()
    })
  })

  describe('pull', () => {
    test('should return no changes when revisions match', async () => {
      const revision = 'abc123'
      Object.defineProperty(gitRepository, '_lastRevision', {
        value: revision,
        writable: true,
      })

      mockGit.pull.mockResolvedValue(undefined)

      mockGit.log.mockResolvedValue({
        latest: { hash: revision },
        total: 1,
        all: [],
      })

      const result = await gitRepository.syncAndAnalyzeChanges()

      expect(result).toEqual({
        hasChangesToApply: false,
        applyTeamsOnly: false,
      })
      expect(mockGit.pull).toHaveBeenCalled()
      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 1 })
    })

    test('should detect changes on first run (empty previous revision)', async () => {
      Object.defineProperty(gitRepository, '_lastRevision', {
        value: '',
        writable: true,
      })

      mockGit.pull.mockResolvedValue(undefined)

      mockGit.log.mockResolvedValue({
        latest: { hash: 'new123' },
        total: 1,
        all: [],
      })

      const result = await gitRepository.syncAndAnalyzeChanges()

      expect(result).toEqual({
        hasChangesToApply: true,
        applyTeamsOnly: false,
      })
      expect(gitRepository.lastRevision).toBe('new123')
      expect(mockGit.pull).toHaveBeenCalled()
      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 1 })
    })

    test('should skip applying changes when all commits have [ci skip] marker', async () => {
      Object.defineProperty(gitRepository, '_lastRevision', {
        value: 'abc123',
        writable: true,
      })

      mockGit.pull.mockResolvedValue(undefined)

      mockGit.log.mockResolvedValueOnce({
        latest: { hash: 'new123' },
        total: 1,
        all: [],
      })

      mockGit.log.mockResolvedValueOnce({
        all: [{ message: 'Commit 1 [ci skip]' }, { message: 'Commit 2 [ci skip]' }],
      })

      const result = await gitRepository.syncAndAnalyzeChanges()

      expect(result).toEqual({
        hasChangesToApply: false,
        applyTeamsOnly: false,
      })
      expect(mockGit.log).toHaveBeenCalledWith({ maxCount: 1 })
      expect(mockGit.log).toHaveBeenCalledWith({
        from: 'abc123',
        to: 'HEAD',
      })
    })

    test('should detect teams-only changes', async () => {
      Object.defineProperty(gitRepository, '_lastRevision', {
        value: 'abc123',
        writable: true,
      })

      mockGit.pull.mockResolvedValue(undefined)

      mockGit.log.mockResolvedValueOnce({
        latest: { hash: 'new123' },
        total: 1,
        all: [],
      })

      mockGit.log.mockResolvedValueOnce({
        all: [{ message: 'Commit without skip marker' }],
      })

      mockGit.diff.mockResolvedValue('env/teams/dev/settings.yaml\nteams/prod/settings.yaml')

      const result = await gitRepository.syncAndAnalyzeChanges()

      expect(result).toEqual({
        hasChangesToApply: true,
        applyTeamsOnly: true,
      })
      expect(gitRepository.lastRevision).toBe('new123')
      expect(mockGit.diff).toHaveBeenCalledWith(['abc123..new123', '--name-only'])
    })

    test('should detect changes with mixed files (not teams-only)', async () => {
      Object.defineProperty(gitRepository, '_lastRevision', {
        value: 'abc123',
        writable: true,
      })

      mockGit.pull.mockResolvedValue(undefined)

      mockGit.log.mockResolvedValueOnce({
        latest: { hash: 'new123' },
        total: 1,
        all: [],
      })

      mockGit.log.mockResolvedValueOnce({
        all: [{ message: 'Commit without skip marker' }],
      })

      mockGit.diff.mockResolvedValue('env/teams/dev/config.yaml\nenv/users/userid.yaml')

      const result = await gitRepository.syncAndAnalyzeChanges()

      expect(result).toEqual({
        hasChangesToApply: true,
        applyTeamsOnly: false,
      })
      expect(gitRepository.lastRevision).toBe('new123')
      expect(mockGit.diff).toHaveBeenCalledWith(['abc123..new123', '--name-only'])
    })

    test('should handle pull failure', async () => {
      const error = new Error('Pull failed')
      mockGit.pull.mockRejectedValue(error)

      await expect(gitRepository.syncAndAnalyzeChanges()).rejects.toBeInstanceOf(OperatorError)
      expect(mockGit.pull).toHaveBeenCalled()
    })
  })

  describe('lastRevision', () => {
    test('should return the last revision', () => {
      const revision = 'test123'
      Object.defineProperty(gitRepository, '_lastRevision', {
        value: revision,
        writable: true,
      })

      expect(gitRepository.lastRevision).toBe(revision)
    })
  })
})
