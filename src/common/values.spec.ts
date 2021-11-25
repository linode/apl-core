/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
import { expect } from 'chai'
import { stub } from 'sinon'
import { fs } from 'zx'
import { objectToYaml, writeValuesToFile } from './values'

describe('Writing values', () => {
  const mockValue = {
    foo: 'bar',
  }
  const mockFile = 'values-stub.yaml'
  it('should write if file does not exist', async () => {
    stub(fs, 'existsSync').withArgs(mockFile).returns(true)
    stub(fs.promises, 'writeFile').withArgs(mockFile, objectToYaml(mockValue)).resolves()
    expect(await writeValuesToFile(mockFile, mockValue)).to.equal(undefined)
  })
})
