import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test-init.ts'],
  moduleDirectories: ['node_modules', __dirname],
  modulePathIgnorePatterns: ['src/cmd/test.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'babel-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@kubernetes/client-node|node-fetch|zx|yaml|glob|minimatch|fetch-blob|formdata-polyfill|data-uri-to-buffer|web-streams-polyfill|openid-client|oauth4webapi|jose)/)',
  ],
  silent: false,
  testMatch: ['**/*.test.ts'],
  verbose: true,
}

export default config
