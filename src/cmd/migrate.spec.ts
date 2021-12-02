import { expect } from 'chai'

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
