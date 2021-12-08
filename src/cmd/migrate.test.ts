import { describe } from 'yargs'
import stubs from '../test-stubs'
import { Changes } from './migrate'

const { terminal } = stubs

describe('Upgrading values', () => {
  const currentVersion = '0.4.5' // otomi.version in values
  const mockChanges: Changes = [{}, {}, {}, {}, {}]
  let deps
  beforeEach(() => {
    deps = {
      debug: terminal(),
    }
  })
  // it('should copy only skeleton files to ENV_DIR if it is empty or nonexisting', async () => {
  //   deps.processValues.mockReturnValue(undefined)
  //   await bootstrapValues(deps)
  //   expect(deps.hfValues).toHaveBeenCalledTimes(0)
  // })

  describe('Filter changes', () => {
    it('should only apply changes whose version >= current version', () => {})
  })
})
