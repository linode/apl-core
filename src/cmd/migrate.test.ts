import stubs from '../test-stubs'
import { Changes, filterChanges, migrate } from './migrate'

const { terminal } = stubs

describe('Upgrading values', () => {
  const currentVersion = '0.4.5' // otomi.version in values
  const mockChanges: Changes = [
    {
      version: '0.1.1',
      deletions: ['some.json.path'],
    },
    {
      version: '0.2.3',
      deletions: ['some.json.path'],
    },
    {
      version: '0.3.4',
      deletions: ['some.json.path'],
    },
    {
      version: '0.5.6',
      deletions: ['some.json.path'],
    },
    {
      version: '0.7.8',
      deletions: ['some.json.path'],
    },
  ]

  describe('Filter changes', () => {
    it('should only apply changes whose version >= current version', () => {
      expect(filterChanges(currentVersion, mockChanges)).toEqual([
        {
          version: '0.5.6',
          deletions: ['some.json.path'],
        },
        {
          version: '0.7.8',
          deletions: ['some.json.path'],
        },
      ])
    })
    it('should only apply changes whose version >= current version in the correct order false positively', () => {
      expect(filterChanges(currentVersion, mockChanges)).not.toEqual([
        {
          version: '0.7.8',
          deletions: ['some.json.path'],
        },
        {
          version: '0.5.6',
          deletions: ['some.json.path'],
        },
      ])
    })
  })
  describe('Apply changes to values', () => {
    const mockValues = { some: { json: { path: 'bla' } } }
    it('should apply changes to values', () => {
      expect(migrate(mockValues, mockChanges)).toEqual({})
    })
  })
})
