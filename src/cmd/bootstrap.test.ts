import { cloneDeep, merge, omit } from 'lodash'
import { pki } from 'node-forge'
import stubs from 'src/test-stubs'
import {
  bootstrap,
  copyBasicFiles,
  createCustomCA,
  getStoredClusterSecrets,
  handleFileEntry,
  initializeGitConfig,
  processValues,
} from './bootstrap'

jest.mock('@linode/kubeseal-encrypt')

const { terminal } = stubs

jest.mock('src/common/envalid', () => ({
  env: {
    VALUES_INPUT: 'testValues.yaml',
    ENV_DIR: '/test',
  },
}))

describe('initializeGitConfig', () => {
  test('should call getInitialGitConfig, setGitConfig and setGitServerConfig when isInitial', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    const deps = {
      getInitialGitConfig: jest.fn().mockResolvedValue({ config: {}, isInitial: true }),
      setGitConfig: jest.fn().mockResolvedValue({}),
      setGitServerConfig: jest.fn(),
      createRepoConfig: jest.fn().mockReturnValue({}),
    }
    try {
      await initializeGitConfig(deps)
    } finally {
      process.env.NODE_ENV = originalNodeEnv
    }
    expect(deps.getInitialGitConfig).toHaveBeenCalledTimes(1)
    expect(deps.setGitConfig).toHaveBeenCalledTimes(1)
    expect(deps.setGitServerConfig).toHaveBeenCalledTimes(1)
  })
})

describe('Bootstrapping values', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(async () => {
    process.env.NODE_ENV = 'production'
  })

  afterEach(async () => {
    process.env.NODE_ENV = originalNodeEnv
  })

  const values = {
    apps: { 'cert-manager': { issuer: 'custom-ca' } },
    cluster: { name: 'bla', provider: 'dida' },
  }
  const users = [{ id: 'user1', initialPassword: 'existing-password' }, { id: 'user2' }]
  const secrets = { secret: 'true', deep: { nested: 'secret' } }
  let deps
  beforeEach(() => {
    deps = {
      $: jest.fn().mockReturnValue({
        nothrow: jest.fn().mockReturnValue({
          quiet: jest.fn(),
        }),
      }),
      bootstrapSealedSecrets: jest.fn(),
      copyBasicFiles: jest.fn(),
      copyFile: jest.fn(),
      createCustomCA: jest.fn(),
      ensureManifestDirectories: jest.fn(),
      handleFileEntry: jest.fn(),
      getK8sSecret: jest.fn(),
      migrate: jest.fn(),
      pathExists: jest.fn(),
      processValues: jest.fn(),
      terminal,
      writeValues: jest.fn(),
    }
  })
  it('should call relevant sub routines', async () => {
    deps.processValues.mockReturnValue({ originalInput: values, allSecrets: {} })
    await bootstrap(deps)
    expect(deps.copyBasicFiles).toHaveBeenCalled()
    expect(deps.bootstrapSealedSecrets).toHaveBeenCalled()
  })
  it('should copy only skeleton files to env dir if it is empty or nonexisting', async () => {
    deps.processValues.mockReturnValue({ originalInput: undefined, allSecrets: {} })
    await bootstrap(deps)
  })
  it('should get stored cluster secrets if those exist', async () => {
    deps.getK8sSecret.mockReturnValue({ 'otomi-generated-passwords': secrets })
    const res = await getStoredClusterSecrets(deps)
    expect(res).toEqual(secrets)
  })
  it('should not get stored cluster secrets if those do not exist', async () => {
    deps.getK8sSecret.mockReturnValue(undefined)
    const res = await getStoredClusterSecrets(deps)
    expect(res).toEqual(undefined)
  })

  describe('Copying basic files', () => {
    const deps = {
      copy: jest.fn(),
      copyFile: jest.fn(),
      copySchema: jest.fn(),
      mkdir: jest.fn(),
      pathExists: jest.fn(),
      terminal,
    }
    it('should not throw any exception', async () => {
      const res = await copyBasicFiles(deps)
      expect(res).toBe(undefined)
    })
  })
  describe('Creating folders and files for workload', () => {
    const values = {
      values: {
        image: {
          repository: 'linode/apl-nodejs-helloworld',
          tag: 'v1.5.1',
        },
      },
    }
    const workload = {
      files: {
        'env/teams/workloads/demo/values.yaml': JSON.stringify(values),
      },
    }
    const deps = {
      loadYaml: jest.fn().mockReturnValue(workload),
      mkdir: jest.fn(),
      terminal,
      writeFile: jest.fn(),
    }
    it('should create folders and files based on file entry in yaml', async () => {
      await handleFileEntry(deps)
      expect(deps.mkdir).toHaveBeenCalledWith('/test/env/teams/workloads/demo', { recursive: true })
      expect(deps.writeFile).toHaveBeenCalledWith('/test/env/teams/workloads/demo/values.yaml', JSON.stringify(values))
    })
  })
  describe('Checking for a custom CA', () => {
    const deps = {
      pki: {
        rsa: {
          generateKeyPair: jest.fn().mockReturnValue({
            publicKey: { n: {}, e: {} },
            privateKey: { d: {}, p: {}, q: {} },
          }),
        },
        createCertificate: jest.fn().mockReturnValue({
          publicKey: {},
          serialNumber: '01',
          validity: {},
          sign: jest.fn(),
          setSubject: jest.fn(),
          setIssuer: jest.fn(),
          setExtensions: jest.fn(),
        }),
        certificateToPem: jest.fn(),
        privateKeyToPem: jest.fn(),
      } as unknown as typeof pki,
      writeValues: jest.fn(),
      terminal,
    }
    deps.pki.certificateToPem = jest.fn().mockReturnValue('certpem')
    deps.pki.privateKeyToPem = jest.fn().mockReturnValue('keypem')
    it('should create a new key pair when none exist', () => {
      const res = createCustomCA(deps)
      expect(res).toMatchObject({
        apps: {
          'cert-manager': {
            customRootCA: 'certpem',
            customRootCAKey: 'keypem',
          },
        },
      })
    })
  })
  describe('processing values', () => {
    const generatedSecrets = { gen: 'x' }
    const generatedPassword = 'generated-password'
    const usersWithPasswords = [
      { id: 'user1', initialPassword: 'existing-password' },
      { id: 'user2', initialPassword: generatedPassword },
    ]
    // Users stored directly in allSecrets (keycloak-operator derives groups from raw fields)

    const ca = { a: 'cert' }
    const mergedSecretsWithGen = merge(cloneDeep(secrets), cloneDeep(generatedSecrets))
    let deps
    beforeEach(() => {
      deps = {
        createCustomCA: jest.fn().mockReturnValue(ca),
        createK8sSecret: jest.fn(),
        generateSecrets: jest.fn().mockReturnValue(generatedSecrets),
        getStoredClusterSecrets: jest.fn().mockReturnValue(secrets),
        loadYaml: jest.fn(),
        terminal,
        writeValues: jest.fn(),
        getUsers: jest.fn().mockReturnValue(usersWithPasswords),
        getSchemaSecretsPaths: jest.fn().mockResolvedValue(['users', 'deep', 'deep.nested', 'secret', 'a']),
        stripAllSecrets: jest.fn().mockImplementation((v) => {
          return omit(v, ['users', 'deep', 'deep.nested', 'secret', 'a'])
        }),
      }
    })
    describe('Creating CA', () => {
      it('should ask to create a CA if issuer is custom-ca', async () => {
        await processValues(deps)
        expect(deps.createCustomCA).toHaveBeenCalledTimes(1)
      })
    })
    describe('processing app values', () => {
      it('should create a custom ca if issuer is custom-ca or undefined and no CA yet exists', async () => {
        deps.loadYaml.mockReturnValue({ apps: { 'cert-manager': { issuer: 'custom-ca' } } })
        await processValues(deps)
        expect(deps.createCustomCA).toHaveBeenCalled()
      })
      it('should not re-create a custom ca if issuer is custom-ca or undefined and a CA already exists', async () => {
        deps.loadYaml.mockReturnValue({
          apps: { 'cert-manager': { issuer: 'custom-ca', customRootCA: 'certpem', customRootCAKey: 'keypem' } },
        })
        await processValues(deps)
        expect(deps.createCustomCA).not.toHaveBeenCalled()
      })
      it('should merge allSecrets into disk values so non-secret fields like customRootCA are preserved', async () => {
        deps.loadYaml.mockReturnValue({
          cluster: { name: 'bla', provider: 'dida' },
        })
        deps.createCustomCA.mockReturnValue(ca)
        const res = await processValues(deps)
        // mergedForDisk includes allSecrets (stripAllSecrets mock is identity, real impl strips x-secret paths)
        expect(deps.writeValues).toHaveBeenNthCalledWith(1, {
          cluster: { name: 'bla', provider: 'dida' },
        })
        expect(res.originalInput).toEqual({
          cluster: { name: 'bla', provider: 'dida' },
          users: [
            { id: 'user1', initialPassword: 'existing-password' },
            { id: 'user2', initialPassword: 'generated-password' },
          ],
        })
      })
      it('should merge originalInput + allSecrets + users for disk (stripAllSecrets removes x-secret paths)', async () => {
        // mergedForDisk = merge(originalInput, allSecrets, { users })
        // allSecrets = merge(ca, storedSecrets, generatedSecrets) + users: usersWithPasswords
        const allSecretsExpected = merge(cloneDeep(ca), secrets, {
          users: usersWithPasswords,
        })
        deps.loadYaml.mockReturnValue({ ...ca, ...secrets, ...values, users })
        deps.getUsers.mockReturnValue(usersWithPasswords)
        const res = await processValues(deps)
        expect(deps.writeValues).toHaveBeenNthCalledWith(1, values)
        expect(res.originalInput).toEqual({
          ...ca,
          ...secrets,
          ...values,
          users: usersWithPasswords,
        })
        expect(res.allSecrets).toEqual(allSecretsExpected)
      })
      it('should call stripAllSecrets before writing values to disk', async () => {
        deps.loadYaml.mockReturnValue(values)
        deps.getSchemaSecretsPaths.mockResolvedValue(['apps.gitea.adminPassword', 'apps.harbor.adminPassword'])
        await processValues(deps)
        expect(deps.stripAllSecrets).toHaveBeenCalledTimes(1)
        expect(deps.getSchemaSecretsPaths).toHaveBeenCalledTimes(1)
      })
      it('should still return full allSecrets for bootstrapSealedSecrets', async () => {
        deps.loadYaml.mockReturnValue({ ...ca, ...secrets, values })
        deps.createCustomCA.mockReturnValue(ca)
        const result = await processValues(deps)
        // allSecrets should contain full unstripped secrets including pre-processed users
        expect(result.allSecrets).toEqual(merge(cloneDeep(ca), secrets, { users: usersWithPasswords }))
      })
      it('should store users as-is in allSecrets (keycloak-operator derives groups)', async () => {
        const storedUsers = [
          {
            email: 'platform-admin@example.com',
            firstName: 'platform',
            lastName: 'admin',
            initialPassword: 'existing-pass',
            isPlatformAdmin: true,
            teams: ['dev'],
          },
        ]
        deps.loadYaml.mockReturnValue({})
        deps.getStoredClusterSecrets.mockReturnValue({ users: storedUsers })
        deps.generateSecrets.mockReturnValue({})
        deps.createCustomCA.mockReturnValue({})
        deps.getUsers.mockReturnValue(storedUsers)

        const result = await processValues(deps)

        // Users stored directly — no groups transformation
        expect(result.allSecrets.users).toEqual(storedUsers)
      })
    })
  })
})
