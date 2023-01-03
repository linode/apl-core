import { hfValues } from 'src/common/hf'
import { rootDir } from 'src/common/utils'
import { stringify } from 'yaml'

describe('Listing values', () => {
  describe('from fixtures', () => {
    it('should generate the same output as snapshot unless intended', async () => {
      const output = await hfValues({}, `${rootDir}/tests/fixtures`)
      // remove uuidv4 generated ids
      const outCleaned = stringify(output).replace(/-[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{10}/g, '')
      expect(outCleaned).toMatchSnapshot()
    })
  })
})
