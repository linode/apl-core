import { hfValues } from 'src/common/hf'
import { getK8sSecret, k8s } from 'src/common/k8s'
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
  getK8sSecret: jest.fn(),
  createUpdateConfigMap: jest.fn(),
  createUpdateGenericSecret: jest.fn(),
  k8s: { core: jest.fn() },
}))

const mockHfValues = jest.mocked(hfValues)
const mockGetK8sSecret = jest.mocked(getK8sSecret)
const mockK8sCore = jest.mocked(k8s.core)

const DOMAIN = 'example.com'
const DEFAULT_EMAIL = `platform-admin@${DOMAIN}`

const BASE_VALUES = {
  cluster: { domainSuffix: DOMAIN },
  otomi: { hasExternalIDP: false },
}

// K8s Secret .data values are base64-encoded
const b64 = (s: string) => Buffer.from(s).toString('base64')

const makeAplUserItem = (email: string, initialPassword: string) => ({
  data: { email: b64(email), initialPassword: b64(initialPassword) },
})

const makePasswordsSecret = (users: { email: string; initialPassword: string }[]) => ({
  'otomi-generated-passwords': { users },
})

describe('initialSetupData', () => {
  let mockListNamespacedSecret: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockHfValues.mockResolvedValue(BASE_VALUES)
    mockListNamespacedSecret = jest.fn().mockResolvedValue({ items: [] })
    mockK8sCore.mockReturnValue({ listNamespacedSecret: mockListNamespacedSecret } as any)
  })

  describe('without external IDP', () => {
    it('returns password from otomi-generated-passwords in standard install', async () => {
      mockGetK8sSecret.mockResolvedValue(makePasswordsSecret([{ email: DEFAULT_EMAIL, initialPassword: 'std-pass' }]))

      const result = await initialSetupData()

      expect(result).toEqual({
        domainSuffix: DOMAIN,
        username: DEFAULT_EMAIL,
        password: 'std-pass',
        secretName: 'platform-admin-initial-credentials',
      })
      expect(mockListNamespacedSecret).not.toHaveBeenCalled()
    })

    it('falls back to apl-users when otomi-generated-passwords is absent (recovery mode)', async () => {
      // getK8sSecret returns undefined for 404 — no exception is thrown
      mockGetK8sSecret.mockResolvedValue(undefined)
      mockListNamespacedSecret.mockResolvedValue({ items: [makeAplUserItem(DEFAULT_EMAIL, 'dr-pass')] })

      const result = await initialSetupData()

      expect(result.password).toBe('dr-pass')
      expect(result.username).toBe(DEFAULT_EMAIL)
      expect(mockListNamespacedSecret).toHaveBeenCalledWith({ namespace: 'apl-users' })
    })

    it('falls back to apl-users when getK8sSecret throws an unexpected error', async () => {
      mockGetK8sSecret.mockRejectedValue(new Error('connection refused'))
      mockListNamespacedSecret.mockResolvedValue({ items: [makeAplUserItem(DEFAULT_EMAIL, 'dr-pass')] })

      const result = await initialSetupData()

      expect(result.password).toBe('dr-pass')
    })

    it('matches platform-admin by email among multiple apl-users secrets', async () => {
      mockGetK8sSecret.mockResolvedValue(undefined)
      mockListNamespacedSecret.mockResolvedValue({
        items: [
          makeAplUserItem('other-user@example.com', 'wrong-pass'),
          makeAplUserItem(DEFAULT_EMAIL, 'correct-pass'),
        ],
      })

      const result = await initialSetupData()

      expect(result.password).toBe('correct-pass')
    })

    it('returns empty password when neither source has a password', async () => {
      mockGetK8sSecret.mockResolvedValue(undefined)
      mockListNamespacedSecret.mockResolvedValue({ items: [] })

      const result = await initialSetupData()
      expect(result.password).toBe('')
    })

    it('returns empty password when platform-admin is found in apl-users but initialPassword is empty', async () => {
      mockGetK8sSecret.mockResolvedValue(undefined)
      mockListNamespacedSecret.mockResolvedValue({ items: [makeAplUserItem(DEFAULT_EMAIL, '')] })

      const result = await initialSetupData()
      expect(result.password).toBe('')
    })
  })

  describe('with external IDP', () => {
    const idpValues = {
      cluster: { domainSuffix: DOMAIN },
      otomi: { hasExternalIDP: true },
      apps: { keycloak: { adminUsername: 'kc-admin' } },
    }

    it('returns keycloak admin credentials', async () => {
      mockHfValues.mockResolvedValue(idpValues)
      mockGetK8sSecret.mockResolvedValue({ adminPassword: 'kc-secret' })

      const result = await initialSetupData()

      expect(result).toEqual({
        domainSuffix: DOMAIN,
        username: 'kc-admin',
        password: 'kc-secret',
        secretName: 'root-credentials',
      })
    })

    it('returns empty password when otomi-secrets is absent', async () => {
      mockHfValues.mockResolvedValue(idpValues)
      mockGetK8sSecret.mockResolvedValue(undefined)

      const result = await initialSetupData()

      expect(result.password).toBe('')
    })
  })
})
