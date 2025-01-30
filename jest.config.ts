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
  transform: {
    '^.+.tsx?$': ['ts-jest', { compiler: 'ttypescript', tsconfig: 'tsconfig.jest.json' }],
  },
  silent: false,
  testMatch: ['**/*.test.ts'],
  verbose: true,
  workerIdleMemoryLimit: 0.3,
}
export default config
