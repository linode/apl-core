import { createMock } from 'ts-auto-mock'
import { OtomiDebugger } from 'src/common/debug'

const stubs = {
  terminal: (): OtomiDebugger =>
    createMock<OtomiDebugger>({
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
}
export default stubs
