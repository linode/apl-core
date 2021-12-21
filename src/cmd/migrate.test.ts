import { applyChanges, Changes, filterChanges } from './migrate'

describe('Upgrading values', () => {
  const oldVersion = 1
  const mockChanges: Changes = [
    {
      version: 1,
      mutations: [{ 'some.version': 'printf "v%s"' }],
    },
    {
      version: 2,
      deletions: ['some.json.path'],
      locations: [{ 'some.json': 'some.bla' }],
    },
    {
      version: 3,
      mutations: [{ 'some.k8sVersion': 'printf "v%s"' }],
    },
  ]

  describe('Filter changes', () => {
    it('should only apply changes whose version >= current version', () => {
      expect(filterChanges(oldVersion, mockChanges)).toEqual([
        {
          version: 2,
          deletions: ['some.json.path'],
          locations: [{ 'some.json': 'some.bla' }],
        },
        {
          version: 3,
          mutations: [{ 'some.k8sVersion': 'printf "v%s"' }],
        },
      ])
    })
  })
  describe('Apply changes to values', () => {
    const mockValues = { version: oldVersion, some: { json: { path: 'bla' }, k8sVersion: '1.18' } }
    it('should apply changes to values', async () => {
      await applyChanges(mockValues, filterChanges(oldVersion, mockChanges))
      expect(mockValues).toEqual({ version: 3, some: { bla: {}, k8sVersion: 'v1.18' } })
    })
  })
})
