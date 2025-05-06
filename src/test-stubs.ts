import { OtomiDebugger, DebugStream } from 'src/common/debug'

class MockDebugStream extends DebugStream {
  constructor() {
    // Pass a mock function as the output and no options
    super(jest.fn())
  }
}

const stubs = {
  terminal: (): OtomiDebugger => ({
    base: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    stream: {
      log: new MockDebugStream(),
      trace: new MockDebugStream(),
      debug: new MockDebugStream(),
      info: new MockDebugStream(),
      warn: new MockDebugStream(),
      error: new MockDebugStream(),
    },
  }),
}

export default stubs
