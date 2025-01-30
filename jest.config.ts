import type { Config } from '@jest/types'

const config: Config.InitialOptions = {
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
  workerIdleMemoryLimit: '100MiB',
  forceExit: true,
  detectOpenHandles: true,
  cache: false,
}
export default config
