import { createMock } from 'ts-auto-mock'
import { OtomiDebugger } from './common/debug'
import { loadYaml } from './common/utils'

let valuesOverrides = {}
export const setValuesOverrides = (overrides: Record<string, any>): void => {
  valuesOverrides = overrides
}

const stubs = {
  terminal: (): OtomiDebugger =>
    createMock<OtomiDebugger>({
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  utils: {
    loadYaml: jest.fn(() => {
      const minimalValues = loadYaml(`${process.cwd()}/src/fixtures/bootstrap/values-full.yaml`)
      return { ...minimalValues, ...valuesOverrides }
    }),
    getFilename: jest.fn(() => 'file-1'),
  },
  values: {
    getImageTag: jest.fn(() => 'tag-1'),
  },
}
export default stubs
