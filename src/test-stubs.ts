import { OtomiDebugger } from 'src/common/debug'

const stubs = {
  terminal: (): Partial<OtomiDebugger> => ({
    base: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}

export default stubs
