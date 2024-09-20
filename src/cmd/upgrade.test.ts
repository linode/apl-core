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

describe('filterUpgrades RC version', () => {
  it('should filter out lower versions', () => {
    const inputData = [{ version: '2.1.0' }, { version: '2.1.1' }]
    const expectedData = [{ version: '2.1.0' }, { version: '2.1.1' }]

    expect(upgrade.filterUpgrades('2.1.1-rc.1', inputData)).toEqual(expectedData)
  })
})
