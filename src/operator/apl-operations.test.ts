import { AplOperations } from './apl-operations'
import { module as applyModule } from '../cmd/apply'
import { module as applyAsAppsModule } from '../cmd/apply-as-apps'
import { module as bootstrapModule } from '../cmd/bootstrap'
import { module as validateValuesModule } from '../cmd/validate-values'
import { OperatorError } from './errors'

// Mock the command modules
jest.mock('../cmd/bootstrap', () => ({
  module: {
    handler: jest.fn(),
  },
}))

jest.mock('../cmd/validate-values', () => ({
  module: {
    handler: jest.fn(),
  },
}))

jest.mock('../cmd/apply', () => ({
  module: {
    handler: jest.fn(),
  },
}))

jest.mock('../cmd/apply-as-apps', () => ({
  module: {
    handler: jest.fn(),
  },
}))

jest.mock('../common/debug', () => ({
  terminal: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}))

describe('AplOperations', () => {
  let aplOperations: AplOperations

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create instance of AplOperations
    aplOperations = new AplOperations()
  })

  describe('bootstrap', () => {
    test('should execute bootstrap successfully', async () => {
      // Mock successful execution
      ;(bootstrapModule.handler as jest.Mock).mockResolvedValue(undefined)

      await aplOperations.bootstrap()

      // Verify bootstrap was called with empty object
      expect(bootstrapModule.handler).toHaveBeenCalledWith({})
    })

    test('should handle bootstrap failure', async () => {
      // Mock a failure
      const error = new Error('Bootstrap error')
      ;(bootstrapModule.handler as jest.Mock).mockRejectedValue(error)

      await expect(aplOperations.bootstrap()).rejects.toBeInstanceOf(OperatorError)

      // Verify bootstrap was called
      expect(bootstrapModule.handler).toHaveBeenCalledWith({})
    })
  })

  describe('validateValues', () => {
    test('should execute validation successfully', async () => {
      // Mock successful execution
      ;(validateValuesModule.handler as jest.Mock).mockResolvedValue(undefined)

      await aplOperations.validateValues()

      // Verify validation was called with empty object
      expect(validateValuesModule.handler).toHaveBeenCalledWith({})
    })

    test('should handle validation failure', async () => {
      // Mock a failure
      const error = new Error('Validation error')
      ;(validateValuesModule.handler as jest.Mock).mockRejectedValue(error)

      await expect(aplOperations.validateValues()).rejects.toBeInstanceOf(OperatorError)

      // Verify validation was called
      expect(validateValuesModule.handler).toHaveBeenCalledWith({})
    })
  })

  describe('apply', () => {
    test('should execute apply successfully', async () => {
      // Mock successful execution
      ;(applyModule.handler as jest.Mock).mockResolvedValue(undefined)

      await aplOperations.apply()

      // Verify apply was called with correct arguments
      expect(applyModule.handler).toHaveBeenCalledWith({
        tekton: true,
        _: [],
        $0: '',
      })
    })

    test('should handle apply failure', async () => {
      // Mock a failure
      const error = new Error('Apply error')
      ;(applyModule.handler as jest.Mock).mockRejectedValue(error)

      await expect(aplOperations.apply()).rejects.toBeInstanceOf(OperatorError)

      // Verify apply was called with correct arguments
      expect(applyModule.handler).toHaveBeenCalledWith({
        tekton: true,
        _: [],
        $0: '',
      })
    })
  })

  describe('applyAsAppsTeams', () => {
    test('should execute applyAsAppsTeams successfully', async () => {
      // Mock successful execution
      ;(applyAsAppsModule.handler as jest.Mock).mockResolvedValue(undefined)

      await aplOperations.applyAsAppsTeams()

      // Verify applyAsApps was called with correct arguments
      expect(applyAsAppsModule.handler).toHaveBeenCalledWith({
        label: ['pipeline=otomi-task-teams'],
      })
    })

    test('should handle applyAsAppsTeams failure', async () => {
      // Mock a failure
      const error = new Error('ApplyAsApps error')
      ;(applyAsAppsModule.handler as jest.Mock).mockRejectedValue(error)

      await expect(aplOperations.applyAsAppsTeams()).rejects.toBeInstanceOf(OperatorError)

      // Verify applyAsApps was called with correct arguments
      expect(applyAsAppsModule.handler).toHaveBeenCalledWith({
        label: ['pipeline=otomi-task-teams'],
      })
    })
  })
})
