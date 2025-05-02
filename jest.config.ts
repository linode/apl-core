import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test-init.ts'],
  moduleDirectories: ['node_modules', __dirname],
  modulePathIgnorePatterns: ['src/cmd/test.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  silent: false,
  testMatch: ['**/*.test.ts'],
  verbose: true,
}

export default config
