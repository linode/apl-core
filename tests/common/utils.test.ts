import { strictEqual } from 'assert'
import { has } from 'lodash-es'
import { generateSecrets } from '../../src/common/utils'

describe('Automatic password generation tests', () => {
  it(`Generated secrets object contains all expected generated secrets`, async () => {
    const generatedSecrets = await generateSecrets({})
    strictEqual(has(generatedSecrets, 'charts.drone.adminToken'), true)
  })
})
