import { hfValues } from 'src/common/hf'
import { initialSetupData } from './commit'

jest.mock('src/common/bootstrap', () => ({ bootstrapGit: jest.fn() }))
jest.mock('src/common/cli', () => ({ prepareEnvironment: jest.fn() }))
jest.mock('src/common/crypt', () => ({ encrypt: jest.fn() }))
jest.mock('src/common/git-config', () => ({ getRepo: jest.fn() }))
jest.mock('src/common/gitea', () => ({ waitTillGitRepoAvailable: jest.fn() }))
jest.mock('./validate-values', () => ({ validateValues: jest.fn() }))
jest.mock('src/common/yargs', () => ({
  getParsedArgs: jest.fn().mockReturnValue({}),
  setParsedArgs: jest.fn(),
  helmOptions: jest.fn().mockReturnValue({}),
  HelmArguments: {},
}))

jest.mock('src/common/envalid', () => ({
  env: { ENV_DIR: '/test/env', isDev: false, DISABLE_SYNC: false },
}))

jest.mock('zx', () => {
  const chainable: any = Promise.resolve({ exitCode: 0, stdout: '', stderr: '' })
  chainable.nothrow = jest.fn().mockReturnValue(chainable)
  chainable.quiet = jest.fn().mockReturnValue(chainable)
  return { $: jest.fn().mockReturnValue(chainable), cd: jest.fn() }
})

jest.mock('src/common/debug', () => ({
  terminal: jest.fn().mockReturnValue({
    base: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    stream: { log: {}, trace: {}, debug: {}, info: {}, warn: {}, error: {} },
  }),
}))

jest.mock('src/common/hf', () => ({ hfValues: jest.fn() }))

jest.mock('src/common/k8s', () => ({
  createUpdateConfigMap: jest.fn(),
  k8s: { core: jest.fn() },
}))

const mockHfValues = jest.mocked(hfValues)

describe('initialSetupData', () => {
  it('returns the domain suffix from rendered values', async () => {
    mockHfValues.mockResolvedValue({ cluster: { domainSuffix: 'example.com' } })

    const result = await initialSetupData()

    expect(result).toEqual({ domainSuffix: 'example.com' })
  })
})
