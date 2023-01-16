import * as upgrade from './upgrade'

describe('filterUpgrades', () => {
  it('should filter out lower versions', () => {
    const inputData = [
      { version: '0.1.1' },
      { version: '1.1.2' },
      { version: '1.1.4' },
      { version: '2.1.1' },
      { version: 'dev' },
    ]
    const expectedData = [{ version: '1.1.4' }, { version: '2.1.1' }, { version: 'dev' }]

    expect(upgrade.filterUpgrades('1.1.3', inputData)).toEqual(expectedData)
  })
})
