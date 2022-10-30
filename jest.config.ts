import type { Config } from '@jest/types'

// Sync object
const config: Config.InitialOptions = {
  // automock: true,
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test-init.ts'],
  moduleDirectories: ['node_modules', __dirname],
  modulePathIgnorePatterns: ['src/cmd/test.ts'],
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      compiler: 'ttypescript',
      tsconfig: 'tsconfig.jest.json',
    },
  },
  silent: false,
  testMatch: ['**/*.test.ts'],
  verbose: true,
}
export default config
