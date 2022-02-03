import { env } from '../common/envalid'
import stubs from '../test-stubs'
import { applyChanges, Changes, filterChanges } from './migrate'

const { terminal } = stubs

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
      locations: { 'some.json': 'some.bla' },
    },
    {
      version: 3,
      mutations: [{ 'some.k8sVersion': 'printf "v%s"' }],
      renamings: { 'somefile.yaml': 'newloc.yaml' },
    },
  ]

  describe('Filter changes', () => {
    it('should only select changes whose version >= current version', () => {
      expect(filterChanges(oldVersion, mockChanges)).toEqual(mockChanges.slice(1, 3))
    })
  })
  describe('Apply changes to values', () => {
    const mockValues = { version: oldVersion, some: { json: { path: 'bla' }, k8sVersion: '1.18' } }
    const deps = {
      existsSync: jest.fn().mockReturnValue(true),
      renameSync: jest.fn(),
      hfValues: jest.fn().mockReturnValue(mockValues),
      terminal,
      writeValues: jest.fn(),
    }
    it('should apply changes to values', async () => {
      await applyChanges(mockChanges.slice(1), false, deps)
      expect(deps.writeValues).toBeCalledWith({
        version: 3,
        some: { bla: {}, k8sVersion: 'v1.18' },
      })
      expect(deps.renameSync).toBeCalledWith(`${env.ENV_DIR}/somefile.yaml`, `${env.ENV_DIR}/newloc.yaml`)
    })
  })
})
