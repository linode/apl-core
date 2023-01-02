import * as utils from './utils'

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
    expect(flattened).toEqual(expectingFlattenedObject)
  })
})

describe('semverCompare', () => {
  it('should indicate version to be higher', () => {
    expect(utils.semverCompare('1.1.3', '0.1.1')).toEqual(1)
  })
  it('should indicate version to be equal', () => {
    expect(utils.semverCompare('0.1.1', '0.1.1')).toEqual(0)
  })
  it('should indicate version to be lower', () => {
    expect(utils.semverCompare('0.1.1', '1.1.3')).toEqual(-1)
  })
})
