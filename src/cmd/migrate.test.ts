import stubs from '../test-stubs'
import { applyChanges, Changes, filterChanges } from './migrate'

const { terminal } = stubs

describe('Upgrading values', () => {
  const oldVersion = 1
  const mockValues = {
    teamConfig: {
      teamA: {
        services: [
          { name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] },
          { name: 'svc1', prop: 'replaceMe', di: [{ ok: 'replaceMeNot' }] },
        ],
      },
    },
    version: oldVersion,
    strToArray: 'ok',
    some: { json: { path: 'bla' }, k8sVersion: '1.18' },
  }
  const mockChanges: Changes = [
    {
      version: 1,
      mutations: [{ 'some.version': 'printf "v%s" .prev' }],
    },
    {
      version: 2,
      deletions: ['some.json.path'],
      relocations: [{ 'some.json': 'some.bla' }],
      mutations: [{ strToArray: 'list .prev' }],
    },
    {
      version: 3,
      mutations: [
        { 'some.k8sVersion': 'printf "v%s" .prev' },
        { 'teamConfig.{team}.services[].prop': 'replaced' },
        { 'teamConfig.{team}.services[].bla[].ok': 'print .prev "ee"' },
      ],
      renamings: [{ 'somefile.yaml': 'newloc.yaml' }],
    },
  ]

  describe('Filter changes', () => {
    it('should only select changes whose version >= current version', () => {
      expect(filterChanges(oldVersion, mockChanges)).toEqual(mockChanges.slice(1, 3))
    })
  })
  describe('Apply changes to values', () => {
    const deps = {
      cd: jest.fn(),
      rename: jest.fn(),
      hfValues: jest.fn().mockReturnValue(mockValues),
      terminal,
      writeValues: jest.fn(),
    }
    it('should apply changes to values', async () => {
      await applyChanges(mockChanges.slice(1), false, deps)
      expect(deps.writeValues).toBeCalledWith(
        {
          teamConfig: {
            teamA: {
              services: [
                { name: 'svc1', prop: 'replaced', bla: [{ ok: 'replaceMeee' }] },
                { name: 'svc1', prop: 'replaced', di: [{ ok: 'replaceMeNot' }] },
              ],
            },
          },
          some: { bla: {}, k8sVersion: 'v1.18' },
          strToArray: ['ok'],
          version: 3,
        },
        true,
      )
      expect(deps.rename).toBeCalledWith(`somefile.yaml`, `newloc.yaml`, false)
    })
  })
})
