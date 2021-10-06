import { expect } from 'chai'
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
          return tmpl as string | Record<string, unknown>
        },
      )
  })
  afterEach(() => {
    sinon.reset()
  })
  it(`Generated secrets object contains all expected generated secrets`, async () => {
    const generatedSecrets = await generateSecrets({})
    expect(generatedSecrets).to.have.nested.property('otomi.adminPassword', '{{ randAlphaNum 20 }}')
  })
})

describe('Flatten objects', () => {
  it('should be flattened', () => {
    const obj = {
      '1': {
        '2': {
          '3': {
            hello: 'world',
            abc: 'def',
            arr: [1, 2, 3],
          },
        },
      },
    }
    const expectingFlattenedObject = {
      '1.2.3.hello': 'world',
      '1.2.3.abc': 'def',
      '1.2.3.arr': [1, 2, 3],
    }
    const flattened = utils.flattenObject(obj)
    expect(flattened).to.deep.equal(expectingFlattenedObject)
  })
})
