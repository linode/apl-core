import { strictEqual } from 'assert'
import { has } from 'lodash'
import * as sinon from 'sinon'
import * as utils from './utils'
import { generateSecrets, GucciOptions } from './utils'

describe('Automatic password generation tests', () => {
  beforeEach(async () => {
    sinon
      .stub(utils, 'gucci')
      .callsFake(
        async (
          tmpl: string | unknown,
          args: { [key: string]: any },
          opts?: GucciOptions,
        ): Promise<string | Record<string, unknown>> => {
          return {}
        },
      )
  })
  afterEach(() => {
    sinon.reset()
    // td.reset()
  })
  it(`Generated secrets object contains all expected generated secrets`, async () => {
    const generatedSecrets = await generateSecrets({})
    strictEqual(has(generatedSecrets, 'charts.drone.adminToken'), true)
  })
})
