import stubs from '../test-stubs'
import { Changes, filterChanges, migrate } from './migrate'

const { terminal } = stubs

describe('Upgrading values', () => {
  const currentVersion = '0.4.5' // otomi.version in values
  const mockChanges: Changes = [
    {
      version: '0.1.1',
    },
    {
      version: '0.2.3',
    },
    {
      version: '0.3.4',
    },
    {
      version: '0.5.6',
      deletions: ['some.json.path'],
      locations: [{ 'some.json': 'some.bla' }],
    },
    {
      version: '0.7.8',
      mutations: [{ 'some.version': 'printf "v%s"' }],
    },
  ]

  describe('Filter changes', () => {
    it('should only apply changes whose version >= current version', () => {
      expect(filterChanges(currentVersion, mockChanges)).toEqual([
        {
          version: '0.5.6',
          deletions: ['some.json.path'],
          locations: [{ 'some.json': 'some.bla' }],
        },
        {
          version: '0.7.8',
          mutations: [{ 'some.version': 'printf v%s' }],
        },
      ])
    })
  })
  describe('Apply changes to values', () => {
    const mockValues = { some: { json: { path: 'bla' }, version: '1.18' } }
    it('should apply changes to values', async () => {
      await migrate(mockValues, mockChanges)
      expect(mockValues).toEqual({ some: { bla: {}, version: 'v1.18' } })
    })
  })
})
