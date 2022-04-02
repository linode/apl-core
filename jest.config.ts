import type { Config } from '@jest/types'

// Sync object
const config: Config.InitialOptions = {
  // automock: true,
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test-init.ts'],
  moduleDirectories: ['node_modules', 'src'],
  modulePathIgnorePatterns: ['src/cmd/test.ts'],
  // moduleNameMapper: {
  //   '(.*)': '<rootDir>/src/$1',
  // },
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      compiler: 'ttypescript',
      tsconfig: 'tsconfig.jest.json',
    },
  },
  // testPathIgnorePatterns: ['<rootDir>/src/test-stubs.ts'],
  // collectCoverageFrom: ['src/**/{!(test-stubs),}.ts'],
  // collectCoverageFrom: ['src/**/*.ts'],
  verbose: true,
}
export default config
