import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  roots: ['<rootDir>/src', '<rootDir>/ci/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test-init.ts'],
  moduleDirectories: ['node_modules', __dirname],
  modulePathIgnorePatterns: ['src/cmd/test.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^yargs$': '<rootDir>/src/stubs/yargs.ts',
    '^uuid$': '<rootDir>/src/stubs/uuid.ts',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs|cjs)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@kubernetes/client-node|@apidevtools/json-schema-ref-parser|node-fetch|yaml|glob|minimatch|fetch-blob|formdata-polyfill|data-uri-to-buffer|web-streams-polyfill|openid-client|oauth4webapi|jose)/)',
  ],
  silent: false,
  testMatch: ['**/*.test.ts'],
  verbose: false,
}

export default config
