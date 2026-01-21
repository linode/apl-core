import { waitTillGitRepoAvailable } from '../common/k8s'
import { AplOperations } from './apl-operations'
import { AplOperator, AplOperatorConfig, ApplyTrigger } from './apl-operator'
import { GitRepository } from './git-repository'
import { updateApplyState } from './k8s'

const mockInfoFn = jest.fn()
const mockWarnFn = jest.fn()
const mockErrorFn = jest.fn()
const mockDebugFn = jest.fn()

const mockGitRepo = {
  clone: jest.fn().mockResolvedValue(undefined),
  syncAndAnalyzeChanges: jest.fn().mockResolvedValue({ hasChangesToApply: false, applyTeamsOnly: false }),
  authenticatedUrl: 'https://username:password@example.com:443/org/repo.git',
  lastRevision: 'abc123',
}

const mockAplOps = {
  bootstrap: jest.fn().mockResolvedValue(undefined),
  validateValues: jest.fn().mockResolvedValue(undefined),
  apply: jest.fn().mockResolvedValue(undefined),
  applyAsAppsTeams: jest.fn().mockResolvedValue(undefined),
  applyTeams: jest.fn().mockResolvedValue(undefined),
  migrate: jest.fn().mockResolvedValue(undefined),
}

jest.mock('../common/debug', () => ({
  terminal: jest.fn().mockImplementation(() => ({
    info: mockInfoFn,
    warn: mockWarnFn,
    error: mockErrorFn,
    debug: mockDebugFn,
  })),
}))

jest.mock('../common/k8s', () => ({
  waitTillGitRepoAvailable: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../common/hf', () => ({
  hfValues: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../common/values', () => ({
  writeValues: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../common/crypt', () => ({
  decrypt: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../common/utils', () => ({
  ensureTeamGitOpsDirectories: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('../cmd/commit', () => ({
  commit: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('./k8s', () => ({
  updateApplyState: jest.fn().mockResolvedValue(undefined),
  appRevisionMatches: jest.fn().mockResolvedValue(true),
}))

jest.mock('./git-repository', () => ({
  GitRepository: jest.fn().mockImplementation(() => mockGitRepo),
}))

jest.mock('./apl-operations', () => ({
  AplOperations: jest.fn().mockImplementation(() => mockAplOps),
}))

describe('AplOperator', () => {
  let aplOperator: AplOperator
  let defaultConfig: AplOperatorConfig

  beforeEach(() => {
    jest.clearAllMocks()

    defaultConfig = {
      gitRepo: mockGitRepo as unknown as GitRepository,
      aplOps: mockAplOps as unknown as AplOperations,
      pollIntervalMs: 1,
      reconcileIntervalMs: 1,
    }

    aplOperator = new AplOperator(defaultConfig)

    jest.useFakeTimers()
    jest.spyOn(global, 'setTimeout')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('constructor', () => {
    test.skip('should initialize with correct configuration', () => {
      expect(mockInfoFn).toHaveBeenCalledWith(
        'Initializing APL Operator with repo URL: https://***@example.com:443/org/repo.git',
      )
    })
  })

  describe('start', () => {
    test('should start operator and initialize repository', async () => {
      const startPromise = aplOperator.start()

      await Promise.resolve()

      Object.defineProperty(aplOperator, 'isRunning', { value: false, configurable: true })

      await startPromise

      expect(waitTillGitRepoAvailable).toHaveBeenCalledWith(mockGitRepo.authenticatedUrl)
      expect(mockGitRepo.clone).toHaveBeenCalled()

      expect(mockInfoFn).toHaveBeenCalledWith('APL operator started successfully')
    })

    test('should handle start failure', async () => {
      const error = new Error('Start failed')
      mockGitRepo.clone.mockRejectedValueOnce(error)

      await expect(aplOperator.start()).rejects.toThrow('Start failed')

      expect(waitTillGitRepoAvailable).toHaveBeenCalledWith(mockGitRepo.authenticatedUrl)
      expect(mockGitRepo.clone).toHaveBeenCalled()

      expect(mockErrorFn).toHaveBeenCalledWith('Failed to start APL operator:', 'Start failed')
    })

    test('should log error if poll or reconcile fails after start', async () => {
      // Make all the setup succeed
      jest.spyOn(aplOperator as any, 'pollAndApplyGitChanges').mockImplementation(() => Promise.resolve())
      jest
        .spyOn(aplOperator as any, 'reconcile')
        .mockImplementation(() => Promise.reject(new Error('Reconcile crashed')))

      // Mock all setup methods to resolve
      mockGitRepo.clone.mockResolvedValue(undefined)
      mockGitRepo.syncAndAnalyzeChanges.mockResolvedValue(undefined)
      aplOperator['aplOps'].bootstrap = jest.fn().mockResolvedValue(undefined)
      aplOperator['aplOps'].validateValues = jest.fn().mockResolvedValue(undefined)

      await aplOperator.start()

      expect(mockErrorFn).toHaveBeenCalledWith('Error in polling or reconcile task:', 'Reconcile crashed')
    })

    test('should handle already running state', async () => {
      Object.defineProperty(aplOperator, 'isRunning', { value: true, configurable: true })

      await aplOperator.start()

      expect(mockWarnFn).toHaveBeenCalledWith('Operator is already running')

      expect(waitTillGitRepoAvailable).not.toHaveBeenCalled()
      expect(mockGitRepo.clone).not.toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    test('should stop a running operator', () => {
      Object.defineProperty(aplOperator, 'isRunning', { value: true, configurable: true })

      aplOperator.stop()

      expect((aplOperator as any).isRunning).toBe(false)

      expect(mockInfoFn).toHaveBeenCalledWith('Stopping APL operator')
    })

    test('should handle stopping a non-running operator', () => {
      Object.defineProperty(aplOperator, 'isRunning', { value: false, configurable: true })

      aplOperator.stop()

      expect(mockWarnFn).toHaveBeenCalledWith('Operator is not running')
    })
  })

  describe('runApplyIfNotBusy', () => {
    test('should run apply process when not busy', async () => {
      Object.defineProperty(aplOperator, 'isApplying', { value: false, configurable: true })

      await aplOperator.runApplyIfNotBusy(ApplyTrigger.Poll)

      expect(mockAplOps.apply).toHaveBeenCalled()
      expect(mockAplOps.migrate).toHaveBeenCalled()
      expect(mockAplOps.validateValues).toHaveBeenCalled()
      expect(updateApplyState).toHaveBeenCalledWith(
        expect.objectContaining({
          commitHash: 'abc123',
          status: 'in-progress',
          trigger: 'poll',
        }),
      )

      expect(updateApplyState).toHaveBeenCalledWith(
        expect.objectContaining({
          commitHash: 'abc123',
          status: 'succeeded',
          trigger: 'poll',
        }),
      )

      expect((aplOperator as any).isApplying).toBe(false)
    })

    test('should run applyAsAppsTeams when teams only flag is set', async () => {
      Object.defineProperty(aplOperator, 'isApplying', { value: false, configurable: true })

      await aplOperator.runApplyIfNotBusy(ApplyTrigger.Poll, true)

      expect(mockAplOps.applyAsAppsTeams).toHaveBeenCalled()
      expect(mockAplOps.apply).not.toHaveBeenCalled()
    })
    test('should run migrate but not validate when run is reconcile', async () => {
      Object.defineProperty(aplOperator, 'isApplying', { value: false, configurable: true })

      await aplOperator.runApplyIfNotBusy(ApplyTrigger.Reconcile, false)

      expect(mockAplOps.apply).toHaveBeenCalled()
      expect(mockAplOps.migrate).toHaveBeenCalled()
      expect(mockAplOps.validateValues).not.toHaveBeenCalled()
    })

    test('should skip if already applying', async () => {
      Object.defineProperty(aplOperator, 'isApplying', { value: true, configurable: true })

      await aplOperator.runApplyIfNotBusy(ApplyTrigger.Poll)

      expect(mockAplOps.apply).not.toHaveBeenCalled()
      expect(mockAplOps.migrate).not.toHaveBeenCalled()
      expect(mockAplOps.validateValues).not.toHaveBeenCalled()
      expect(updateApplyState).not.toHaveBeenCalled()

      expect(mockInfoFn).toHaveBeenCalledWith('[poll] Apply already in progress, skipping')
    })

    test('should handle apply failure', async () => {
      Object.defineProperty(aplOperator, 'isApplying', { value: false, configurable: true })

      const error = new Error('Apply failed')
      mockAplOps.apply.mockRejectedValueOnce(error)

      await aplOperator.runApplyIfNotBusy(ApplyTrigger.Poll)

      expect(updateApplyState).toHaveBeenCalledWith(
        expect.objectContaining({
          commitHash: 'abc123',
          status: 'failed',
          trigger: 'poll',
          errorMessage: 'Apply failed',
        }),
      )

      expect((aplOperator as any).isApplying).toBe(false)

      expect(mockErrorFn).toHaveBeenCalledWith('[poll] Apply process failed', 'Apply failed')
    })
  })

  describe('pollAndApplyGitChanges', () => {
    test('should poll and apply changes if detected', async () => {
      jest.useFakeTimers()

      mockGitRepo.syncAndAnalyzeChanges.mockResolvedValueOnce({
        hasChangesToApply: true,
        applyTeamsOnly: false,
      })
      ;(aplOperator as any).isRunning = true
      ;(aplOperator as any).isApplying = false

      const runApplyIfNotBusySpy = jest.spyOn(aplOperator as any, 'runApplyIfNotBusy')

      const pollPromise = aplOperator.pollAndApplyGitChanges(1)

      await Promise.resolve()
      await Promise.resolve()

      await jest.runOnlyPendingTimersAsync()
      ;(aplOperator as any).isRunning = false

      await pollPromise

      expect(runApplyIfNotBusySpy).toHaveBeenCalledWith('poll', false)
      const logCalls = mockInfoFn.mock.calls.flat()
      expect(logCalls).toContain('Starting git polling loop')
      expect(logCalls).toContain('[poll] Starting apply process')
      expect(logCalls).toContain('[poll] Apply process completed')
      expect(logCalls).toContain('[poll] Starting validation process')
      expect(logCalls).toContain('[poll] Validation process completed')
      expect(logCalls).toContain('Git polling loop stopped')
    })

    test('should skip polling if apply is in progress', async () => {
      Object.defineProperty(aplOperator as any, 'isRunning', {
        value: true,
        writable: true,
      })

      Object.defineProperty(aplOperator as any, 'isApplying', {
        value: true,
        writable: true,
      })

      const pollPromise = aplOperator.pollAndApplyGitChanges()

      await Promise.resolve()
      jest.advanceTimersByTime(defaultConfig.pollIntervalMs)

      Object.defineProperty(aplOperator as any, 'isRunning', { value: false })

      await pollPromise

      expect(mockGitRepo.syncAndAnalyzeChanges).not.toHaveBeenCalled()
      expect(mockDebugFn).toHaveBeenCalledWith('Skipping polling cycle, apply process is in progress')
      expect(mockInfoFn).toHaveBeenCalledWith('Git polling loop stopped')
    })

    test('should log error if pull fails', async () => {
      mockGitRepo.syncAndAnalyzeChanges.mockRejectedValueOnce(new Error('Pull failed'))

      Object.defineProperty(aplOperator as any, 'isRunning', {
        value: true,
        writable: true,
      })

      Object.defineProperty(aplOperator as any, 'isApplying', {
        value: false,
        writable: true,
      })

      const pollPromise = aplOperator.pollAndApplyGitChanges()

      await Promise.resolve()
      jest.advanceTimersByTime(defaultConfig.pollIntervalMs)

      Object.defineProperty(aplOperator as any, 'isRunning', { value: false })

      await pollPromise

      expect(mockErrorFn).toHaveBeenCalledWith('Error during git polling cycle:', 'Pull failed')
    })
  })

  describe('reconcile', () => {
    test('should reconcile and call apply', async () => {
      jest.useFakeTimers()
      ;(aplOperator as any).isRunning = true
      const runApplyIfNotBusySpy = jest.spyOn(aplOperator as any, 'runApplyIfNotBusy')

      const reconcilePromise = aplOperator.reconcile(1)

      await Promise.resolve()
      await Promise.resolve()

      await jest.runOnlyPendingTimersAsync()
      ;(aplOperator as any).isRunning = false

      await reconcilePromise

      expect(runApplyIfNotBusySpy).toHaveBeenCalledWith('reconcile')

      const logCalls = mockInfoFn.mock.calls.flat()
      expect(logCalls).toContain('Starting reconciliation loop')
      expect(logCalls).toContain('Reconciliation triggered')
      expect(logCalls).toContain('Reconciliation triggered')
      expect(logCalls).toContain('[reconcile] Starting apply process')
      expect(logCalls).toContain('[reconcile] Apply process completed')
      expect(logCalls).toContain('Reconciliation completed')
      expect(logCalls).toContain('Reconciliation loop stopped')
    })

    test('should handle errors during reconcile', async () => {
      const error = new Error('Reconcile error')
      const runApplyIfNotBusySpy = jest.spyOn(aplOperator as any, 'runApplyIfNotBusy').mockRejectedValueOnce(error)

      Object.defineProperty(aplOperator as any, 'isRunning', {
        value: true,
        writable: true,
      })

      const reconcilePromise = aplOperator.reconcile()

      await Promise.resolve()
      jest.advanceTimersByTime(defaultConfig.reconcileIntervalMs)

      Object.defineProperty(aplOperator as any, 'isRunning', { value: false })

      await reconcilePromise

      expect(runApplyIfNotBusySpy).toHaveBeenCalled()
      expect(mockErrorFn).toHaveBeenCalledWith('Error during reconciliation:', 'Reconcile error')
      expect(mockInfoFn).toHaveBeenCalledWith('Reconciliation loop stopped')
    })
  })
})
