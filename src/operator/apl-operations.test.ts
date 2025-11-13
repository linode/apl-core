import { module as applyModule } from '../cmd/apply'
import { module as applyAsAppsModule } from '../cmd/apply-as-apps'
import { module as bootstrapModule } from '../cmd/bootstrap'
import { module as migrateModule } from '../cmd/migrate'
import { module as validateValuesModule } from '../cmd/validate-values'
import { AplOperations } from './apl-operations'
import { OperatorError } from './errors'

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

jest.mock('../cmd/validate-cluster', () => ({
  module: {
    handler: jest.fn(),
  },
}))

jest.mock('../cmd/apply', () => ({
  module: {
    handler: jest.fn(),
  },
}))

jest.mock('../cmd/install', () => ({
  module: {
    handler: jest.fn(),
  },
}))

jest.mock('../cmd/apply-as-apps', () => ({
  module: {
    handler: jest.fn(),
  },
}))

jest.mock('../cmd/apply-teams', () => ({
  module: {
    handler: jest.fn(),
  },
}))

jest.mock('../cmd/migrate', () => ({
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
    jest.clearAllMocks()

    aplOperations = new AplOperations()
  })

  describe('bootstrap', () => {
    test('should execute bootstrap successfully', async () => {
      ;(bootstrapModule.handler as jest.Mock).mockResolvedValue(undefined)

      await aplOperations.bootstrap()

      expect(bootstrapModule.handler).toHaveBeenCalledWith({})
    })

    test('should handle bootstrap failure', async () => {
      const error = new Error('Bootstrap error')
      ;(bootstrapModule.handler as jest.Mock).mockRejectedValue(error)

      await expect(aplOperations.bootstrap()).rejects.toBeInstanceOf(OperatorError)

      expect(bootstrapModule.handler).toHaveBeenCalledWith({})
    })
  })

  describe('migrate', () => {
    test('should execute migrate successfully', async () => {
      ;(migrateModule.handler as jest.Mock).mockResolvedValue(undefined)

      await aplOperations.migrate()

      expect(migrateModule.handler).toHaveBeenCalledWith({
        nonInteractive: true,
        _: [] as string[],
        $0: '',
      })
    })

    test('should handle migrate failure', async () => {
      const error = new Error('Migrate error')
      ;(migrateModule.handler as jest.Mock).mockRejectedValue(error)

      await expect(aplOperations.migrate()).rejects.toBeInstanceOf(OperatorError)

      expect(migrateModule.handler).toHaveBeenCalledWith({
        nonInteractive: true,
        _: [] as string[],
        $0: '',
      })
    })
  })

  describe('validateValues', () => {
    test('should execute validation successfully', async () => {
      ;(validateValuesModule.handler as jest.Mock).mockResolvedValue(undefined)

      await aplOperations.validateValues()

      expect(validateValuesModule.handler).toHaveBeenCalledWith({})
    })

    test('should handle validation failure', async () => {
      const error = new Error('Validation error')
      ;(validateValuesModule.handler as jest.Mock).mockRejectedValue(error)

      await expect(aplOperations.validateValues()).rejects.toBeInstanceOf(OperatorError)

      expect(validateValuesModule.handler).toHaveBeenCalledWith({})
    })
  })

  describe('apply', () => {
    test('should execute apply successfully', async () => {
      ;(applyModule.handler as jest.Mock).mockResolvedValue(undefined)

      await aplOperations.apply()

      expect(applyModule.handler).toHaveBeenCalledWith({
        tekton: true,
        _: [],
        $0: '',
      })
    })

    test('should handle apply failure', async () => {
      const error = new Error('Apply error')
      ;(applyModule.handler as jest.Mock).mockRejectedValue(error)

      await expect(aplOperations.apply()).rejects.toBeInstanceOf(OperatorError)

      expect(applyModule.handler).toHaveBeenCalledWith({
        tekton: true,
        _: [],
        $0: '',
      })
    })
  })

  describe('applyAsAppsTeams', () => {
    test('should execute applyAsAppsTeams successfully', async () => {
      ;(applyAsAppsModule.handler as jest.Mock).mockResolvedValue(undefined)

      await aplOperations.applyAsAppsTeams()

      expect(applyAsAppsModule.handler).toHaveBeenCalledWith({
        label: ['pipeline=otomi-task-teams'],
      })
    })

    test('should handle applyAsAppsTeams failure', async () => {
      const error = new Error('ApplyAsApps error')
      ;(applyAsAppsModule.handler as jest.Mock).mockRejectedValue(error)

      await expect(aplOperations.applyAsAppsTeams()).rejects.toBeInstanceOf(OperatorError)

      expect(applyAsAppsModule.handler).toHaveBeenCalledWith({
        label: ['pipeline=otomi-task-teams'],
      })
    })
  })
})
