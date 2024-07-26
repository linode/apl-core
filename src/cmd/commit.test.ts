import path from 'path'

describe('Test commit', () => {
  it('Test commit', () => {
    process.env.NODE_ENV = 'test'
    process.env.ENV_DIR = path.resolve(process.cwd(), 'tests/fixtures')
    //
    // await commit()
  })
})
