import { pki } from 'node-forge'
import stubs from 'src/test-stubs'
import {
  APP_NAMESPACE_MAP,
  APP_SECRET_OVERRIDES,
  bootstrapSealedSecrets,
  buildSecretToNamespaceMap,
  createSealedSecretManifest,
  createSealedSecretsKeySecret,
  generateSealedSecretsKeyPair,
  getPemFromCertificate,
  writeSealedSecretManifests,
} from './sealed-secrets'

const { terminal } = stubs

jest.mock('@linode/kubeseal-encrypt', () => ({
  encryptSecretItem: jest.fn().mockResolvedValue('encrypted-value'),
}))

jest.mock('zx', () => ({
  $: jest.fn().mockReturnValue({
    nothrow: jest.fn().mockReturnValue({
      quiet: jest.fn().mockResolvedValue({ stderr: '', exitCode: 0 }),
    }),
  }),
}))

jest.mock('src/common/envalid', () => ({
  env: {},
}))

describe('sealed-secrets', () => {
  describe('generateSealedSecretsKeyPair', () => {
    it('should generate a valid key pair with certificate and private key', () => {
      const mockCert = {
        publicKey: {},
        serialNumber: '',
        validity: { notBefore: new Date(), notAfter: new Date() },
        sign: jest.fn(),
        setSubject: jest.fn(),
        setIssuer: jest.fn(),
        setExtensions: jest.fn(),
      }
      const mockKeys = {
        publicKey: { n: {}, e: {} },
        privateKey: { d: {}, p: {}, q: {} },
      }
      const deps = {
        terminal,
        pki: {
          rsa: { generateKeyPair: jest.fn().mockReturnValue(mockKeys) },
          createCertificate: jest.fn().mockReturnValue(mockCert),
          certificateToPem: jest.fn().mockReturnValue('-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----\n'),
          privateKeyToPem: jest
            .fn()
            .mockReturnValue('-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----\n'),
        } as unknown as typeof pki,
      }

      const result = generateSealedSecretsKeyPair(deps)

      expect(deps.pki.rsa.generateKeyPair).toHaveBeenCalledWith(4096)
      expect(deps.pki.createCertificate).toHaveBeenCalled()
      expect(mockCert.sign).toHaveBeenCalled()
      expect(result.certificate).toContain('BEGIN CERTIFICATE')
      expect(result.privateKey).toContain('BEGIN RSA PRIVATE KEY')
    })

    it('should set 10-year validity', () => {
      const mockCert = {
        publicKey: {},
        serialNumber: '',
        validity: { notBefore: new Date(), notAfter: new Date() },
        sign: jest.fn(),
        setSubject: jest.fn(),
        setIssuer: jest.fn(),
        setExtensions: jest.fn(),
      }
      const mockKeys = {
        publicKey: {},
        privateKey: {},
      }
      const deps = {
        terminal,
        pki: {
          rsa: { generateKeyPair: jest.fn().mockReturnValue(mockKeys) },
          createCertificate: jest.fn().mockReturnValue(mockCert),
          certificateToPem: jest.fn().mockReturnValue('cert'),
          privateKeyToPem: jest.fn().mockReturnValue('key'),
        } as unknown as typeof pki,
      }

      generateSealedSecretsKeyPair(deps)

      const notBefore = mockCert.validity.notBefore.getFullYear()
      const notAfter = mockCert.validity.notAfter.getFullYear()
      expect(notAfter - notBefore).toBe(10)
    })
  })

  describe('getPemFromCertificate', () => {
    it('should extract SPKI public key from a certificate', () => {
      // Generate a real key pair and certificate for this test
      const keys = pki.rsa.generateKeyPair(2048)
      const cert = pki.createCertificate()
      cert.publicKey = keys.publicKey
      cert.serialNumber = '01'
      cert.validity.notBefore = new Date()
      cert.validity.notAfter = new Date()
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1)
      const attrs = [{ name: 'commonName', value: 'test' }]
      cert.setSubject(attrs)
      cert.setIssuer(attrs)
      cert.sign(keys.privateKey)
      const certPem = pki.certificateToPem(cert)

      const result = getPemFromCertificate(certPem)

      expect(result).toContain('BEGIN PUBLIC KEY')
      expect(result).toContain('END PUBLIC KEY')
    })
  })

  describe('createSealedSecretsKeySecret', () => {
    it('should create secret if it does not exist', async () => {
      const mockQuiet = jest.fn().mockResolvedValue({ stderr: '', exitCode: 0 })
      const mockNothrow = jest.fn().mockReturnValue({ quiet: mockQuiet })
      // First call (namespace): success, Second call (check exists): not found (exitCode 1)
      // Third call (create): success, Fourth call (label): success
      const mock$ = jest
        .fn()
        .mockReturnValueOnce({
          nothrow: jest.fn().mockReturnValue({ quiet: jest.fn().mockResolvedValue({ exitCode: 0 }) }),
        }) // namespace
        .mockReturnValueOnce({
          nothrow: jest.fn().mockReturnValue({ quiet: jest.fn().mockResolvedValue({ exitCode: 1 }) }),
        }) // check exists - NOT FOUND
        .mockReturnValueOnce({
          nothrow: jest.fn().mockReturnValue({ quiet: jest.fn().mockResolvedValue({ exitCode: 0 }) }),
        }) // create
        .mockReturnValueOnce({
          nothrow: jest.fn().mockReturnValue({ quiet: jest.fn().mockResolvedValue({ exitCode: 0 }) }),
        }) // label
      const deps = {
        $: mock$ as any,
        terminal,
        writeFile: jest.fn(),
        mkdir: jest.fn(),
      }

      await createSealedSecretsKeySecret('cert-pem', 'key-pem', deps)

      expect(mock$).toHaveBeenCalledTimes(4)
      expect(deps.writeFile).toHaveBeenCalledWith('/tmp/sealed-secrets-bootstrap/tls.crt', 'cert-pem')
      expect(deps.writeFile).toHaveBeenCalledWith('/tmp/sealed-secrets-bootstrap/tls.key', 'key-pem')
    })

    it('should skip creation if secret already exists', async () => {
      const mock$ = jest
        .fn()
        .mockReturnValueOnce({
          nothrow: jest.fn().mockReturnValue({ quiet: jest.fn().mockResolvedValue({ exitCode: 0 }) }),
        }) // namespace
        .mockReturnValueOnce({
          nothrow: jest.fn().mockReturnValue({ quiet: jest.fn().mockResolvedValue({ exitCode: 0 }) }),
        }) // check exists - FOUND
      const deps = {
        $: mock$ as any,
        terminal,
        writeFile: jest.fn(),
        mkdir: jest.fn(),
      }

      await createSealedSecretsKeySecret('cert-pem', 'key-pem', deps)

      // Should only call namespace and check exists, not create or label
      expect(mock$).toHaveBeenCalledTimes(2)
      expect(deps.writeFile).not.toHaveBeenCalled()
    })
  })

  describe('buildSecretToNamespaceMap', () => {
    it('should group secrets by namespace and secret name with leaf key naming', async () => {
      const secrets = {
        apps: {
          harbor: { adminPassword: 'harbor-pass', secretKey: 'harbor-secret' },
        },
      }
      const deps = {
        getSchemaSecretsPaths: jest.fn().mockResolvedValue(['apps.harbor.adminPassword', 'apps.harbor.secretKey']),
      }

      const result = await buildSecretToNamespaceMap(secrets, [], undefined, deps)

      const harborMapping = result.find((m) => m.namespace === 'harbor')
      expect(harborMapping).toBeDefined()
      expect(harborMapping!.secretName).toBe('harbor-secrets')
      expect(harborMapping!.data).toHaveProperty('adminPassword', 'harbor-pass')
      expect(harborMapping!.data).toHaveProperty('secretKey', 'harbor-secret')
    })

    it('should skip kms.sops paths', async () => {
      const secrets = {
        kms: { sops: { provider: 'age', age: { publicKey: 'pk', privateKey: 'sk' } } },
        apps: { harbor: { adminPassword: 'pass' } },
      }
      const deps = {
        getSchemaSecretsPaths: jest
          .fn()
          .mockResolvedValue(['kms.sops.provider', 'kms.sops.age.publicKey', 'apps.harbor.adminPassword']),
      }

      const result = await buildSecretToNamespaceMap(secrets, [], undefined, deps)

      expect(result).toHaveLength(1)
      expect(result[0].namespace).toBe('harbor')
    })

    it('should skip users path', async () => {
      const secrets = {
        users: [{ email: 'admin@example.com' }],
        apps: { harbor: { adminPassword: 'pass' } },
      }
      const deps = {
        getSchemaSecretsPaths: jest.fn().mockResolvedValue(['users', 'apps.harbor.adminPassword']),
      }

      const result = await buildSecretToNamespaceMap(secrets, [], undefined, deps)

      expect(result).toHaveLength(1)
      expect(result[0].namespace).toBe('harbor')
    })

    it('should handle teamConfig dynamic paths', async () => {
      const secrets = {
        teamConfig: {
          'team-alpha': { someSecret: 'value' },
        },
      }
      const deps = {
        getSchemaSecretsPaths: jest.fn().mockResolvedValue(['teamConfig.team-alpha.someSecret']),
      }

      const result = await buildSecretToNamespaceMap(secrets, ['team-alpha'], undefined, deps)

      expect(result).toHaveLength(1)
      expect(result[0].namespace).toBe('team-team-alpha')
      expect(result[0].secretName).toBe('team-settings-secrets')
    })

    it('should filter out mappings with no data', async () => {
      const secrets = {}
      const deps = {
        getSchemaSecretsPaths: jest.fn().mockResolvedValue(['apps.harbor.adminPassword']),
      }

      const result = await buildSecretToNamespaceMap(secrets, [], undefined, deps)

      expect(result).toHaveLength(0)
    })

    it('should use leaf key naming for nested secret paths', async () => {
      const secrets = {
        apps: {
          harbor: { core: { secret: 'core-secret-val' } },
        },
      }
      const deps = {
        getSchemaSecretsPaths: jest.fn().mockResolvedValue(['apps.harbor.core.secret']),
      }

      const result = await buildSecretToNamespaceMap(secrets, [], undefined, deps)

      expect(result).toHaveLength(1)
      expect(result[0].data).toHaveProperty('core_secret', 'core-secret-val')
    })

    it('should skip overridden prefixes and generate override secrets instead', async () => {
      const secrets = {
        apps: {
          gitea: { adminPassword: 'gitea-pass', postgresqlPassword: 'pg-pass' },
          harbor: { adminPassword: 'harbor-pass' },
        },
      }
      const allValues = {
        apps: {
          gitea: { adminUsername: 'admin', adminPassword: 'gitea-pass', postgresqlPassword: 'pg-pass' },
          harbor: { adminPassword: 'harbor-pass' },
        },
      }
      const deps = {
        getSchemaSecretsPaths: jest
          .fn()
          .mockResolvedValue([
            'apps.gitea.adminPassword',
            'apps.gitea.postgresqlPassword',
            'apps.harbor.adminPassword',
          ]),
      }

      const result = await buildSecretToNamespaceMap(secrets, [], allValues, deps)

      // Harbor should use default convention
      const harborMapping = result.find((m) => m.secretName === 'harbor-secrets')
      expect(harborMapping).toBeDefined()
      expect(harborMapping!.data).toHaveProperty('adminPassword', 'harbor-pass')

      // Gitea should NOT have a gitea-secrets mapping
      const giteaDefaultMapping = result.find((m) => m.secretName === 'gitea-secrets')
      expect(giteaDefaultMapping).toBeUndefined()

      // Gitea should have override-based secrets
      const giteaAdminMapping = result.find((m) => m.secretName === 'gitea-admin-secret')
      expect(giteaAdminMapping).toBeDefined()
      expect(giteaAdminMapping!.namespace).toBe('gitea')
      expect(giteaAdminMapping!.data).toEqual({ username: 'admin', password: 'gitea-pass' })

      const giteaDbMapping = result.find((m) => m.secretName === 'gitea-db-secret')
      expect(giteaDbMapping).toBeDefined()
      expect(giteaDbMapping!.namespace).toBe('gitea')
      expect(giteaDbMapping!.data).toEqual({ username: 'gitea', password: 'pg-pass' })
    })

    it('should include static values in override secrets', async () => {
      const secrets = {
        apps: {
          gitea: { postgresqlPassword: 'pg-pass' },
        },
      }
      const allValues = {
        apps: {
          gitea: { postgresqlPassword: 'pg-pass' },
        },
      }
      const deps = {
        getSchemaSecretsPaths: jest.fn().mockResolvedValue(['apps.gitea.postgresqlPassword']),
      }

      const result = await buildSecretToNamespaceMap(secrets, [], allValues, deps)

      const giteaDbMapping = result.find((m) => m.secretName === 'gitea-db-secret')
      expect(giteaDbMapping).toBeDefined()
      expect(giteaDbMapping!.data.username).toBe('gitea')
      expect(giteaDbMapping!.data.password).toBe('pg-pass')
    })

    it('should use default values when valuePath not found but actual value exists', async () => {
      // When adminPassword exists but adminUsername doesn't, username should use default
      const secrets = {
        apps: {
          gitea: { adminPassword: 'gitea-pass' },
        },
      }
      const allValues = {
        apps: {
          gitea: { adminPassword: 'gitea-pass' }, // no adminUsername provided
        },
      }
      const deps = {
        getSchemaSecretsPaths: jest.fn().mockResolvedValue(['apps.gitea.adminPassword']),
      }

      const result = await buildSecretToNamespaceMap(secrets, [], allValues, deps)

      const giteaAdminMapping = result.find((m) => m.secretName === 'gitea-admin-secret')
      expect(giteaAdminMapping).toBeDefined()
      expect(giteaAdminMapping!.data.username).toBe('otomi-admin') // default value
      expect(giteaAdminMapping!.data.password).toBe('gitea-pass')
    })
  })

  describe('createSealedSecretManifest', () => {
    it('should produce correct SealedSecret structure', async () => {
      const mapping = {
        namespace: 'harbor',
        secretName: 'harbor-secrets',
        data: { adminPassword: 'my-password', secretKey: 'my-secret' },
      }
      const deps = {
        encryptSecretItem: jest.fn().mockResolvedValue('encrypted-value'),
      }

      const result = await createSealedSecretManifest('mock-pem', mapping, deps)

      expect(result.apiVersion).toBe('bitnami.com/v1alpha1')
      expect(result.kind).toBe('SealedSecret')
      expect(result.metadata.name).toBe('harbor-secrets')
      expect(result.metadata.namespace).toBe('harbor')
      expect(result.metadata.annotations['sealedsecrets.bitnami.com/namespace-wide']).toBe('true')
      expect(result.spec.encryptedData.adminPassword).toBe('encrypted-value')
      expect(result.spec.encryptedData.secretKey).toBe('encrypted-value')
      expect(result.spec.template.type).toBe('Opaque')
      expect(result.spec.template.metadata.name).toBe('harbor-secrets')
      expect(result.spec.template.metadata.namespace).toBe('harbor')
    })

    it('should call encryptSecretItem for each data key', async () => {
      const mapping = {
        namespace: 'gitea',
        secretName: 'gitea-secrets',
        data: { key1: 'val1', key2: 'val2', key3: 'val3' },
      }
      const deps = {
        encryptSecretItem: jest.fn().mockResolvedValue('enc'),
      }

      await createSealedSecretManifest('pem', mapping, deps)

      expect(deps.encryptSecretItem).toHaveBeenCalledTimes(3)
      expect(deps.encryptSecretItem).toHaveBeenCalledWith('pem', 'gitea', 'val1')
      expect(deps.encryptSecretItem).toHaveBeenCalledWith('pem', 'gitea', 'val2')
      expect(deps.encryptSecretItem).toHaveBeenCalledWith('pem', 'gitea', 'val3')
    })
  })

  describe('writeSealedSecretManifests', () => {
    it('should write each manifest to the correct directory', async () => {
      const manifests = [
        {
          apiVersion: 'bitnami.com/v1alpha1',
          kind: 'SealedSecret',
          metadata: {
            annotations: { 'sealedsecrets.bitnami.com/namespace-wide': 'true' },
            name: 'harbor-secrets',
            namespace: 'harbor',
          },
          spec: {
            encryptedData: { key: 'enc' },
            template: {
              immutable: false,
              metadata: { name: 'harbor-secrets', namespace: 'harbor' },
              type: 'Opaque',
            },
          },
        },
      ]
      const deps = {
        mkdir: jest.fn(),
        writeFile: jest.fn(),
        objectToYaml: jest.fn().mockReturnValue('yaml-content'),
        terminal,
      }

      await writeSealedSecretManifests(manifests, '/test', deps)

      expect(deps.mkdir).toHaveBeenCalledWith('/test/env/manifests/ns/harbor', { recursive: true })
      expect(deps.writeFile).toHaveBeenCalledWith('/test/env/manifests/ns/harbor/harbor-secrets.yaml', 'yaml-content')
    })
  })

  describe('bootstrapSealedSecrets', () => {
    it('should generate new key pair when no existing cert found', async () => {
      const secrets = {
        apps: { harbor: { adminPassword: 'pass' } },
      }
      const mockMapping = {
        namespace: 'harbor',
        secretName: 'harbor-secrets',
        data: { adminPassword: 'pass' },
      }
      const mockManifest = {
        apiVersion: 'bitnami.com/v1alpha1',
        kind: 'SealedSecret',
        metadata: {
          annotations: { 'sealedsecrets.bitnami.com/namespace-wide': 'true' },
          name: 'harbor-secrets',
          namespace: 'harbor',
        },
        spec: {
          encryptedData: { adminPassword: 'encrypted' },
          template: {
            immutable: false,
            metadata: { name: 'harbor-secrets', namespace: 'harbor' },
            type: 'Opaque',
          },
        },
      }

      const deps = {
        terminal,
        getExistingSealedSecretsCert: jest.fn().mockResolvedValue(undefined), // No existing cert
        generateSealedSecretsKeyPair: jest.fn().mockReturnValue({
          certificate: 'cert-pem',
          privateKey: 'key-pem',
        }),
        getPemFromCertificate: jest.fn().mockReturnValue('spki-pem'),
        createSealedSecretsKeySecret: jest.fn(),
        buildSecretToNamespaceMap: jest.fn().mockResolvedValue([mockMapping]),
        createSealedSecretManifest: jest.fn().mockResolvedValue(mockManifest),
        writeSealedSecretManifests: jest.fn(),
        encryptSecretItem: jest.fn().mockResolvedValue('encrypted'),
      }

      await bootstrapSealedSecrets(secrets, '/test', undefined, deps)

      expect(deps.getExistingSealedSecretsCert).toHaveBeenCalled()
      expect(deps.generateSealedSecretsKeyPair).toHaveBeenCalled()
      expect(deps.createSealedSecretsKeySecret).toHaveBeenCalledWith('cert-pem', 'key-pem')
      expect(deps.getPemFromCertificate).toHaveBeenCalledWith('cert-pem')
      expect(deps.writeSealedSecretManifests).toHaveBeenCalledWith([mockManifest], '/test')
    })

    it('should use existing cert when found', async () => {
      const secrets = {
        apps: { harbor: { adminPassword: 'pass' } },
      }
      const mockMapping = {
        namespace: 'harbor',
        secretName: 'harbor-secrets',
        data: { adminPassword: 'pass' },
      }

      const deps = {
        terminal,
        getExistingSealedSecretsCert: jest.fn().mockResolvedValue('existing-cert-pem'), // Existing cert found
        generateSealedSecretsKeyPair: jest.fn(),
        getPemFromCertificate: jest.fn().mockReturnValue('existing-spki-pem'),
        createSealedSecretsKeySecret: jest.fn(),
        buildSecretToNamespaceMap: jest.fn().mockResolvedValue([mockMapping]),
        createSealedSecretManifest: jest.fn().mockResolvedValue({}),
        writeSealedSecretManifests: jest.fn(),
        encryptSecretItem: jest.fn(),
      }

      await bootstrapSealedSecrets(secrets, '/test', undefined, deps)

      expect(deps.getExistingSealedSecretsCert).toHaveBeenCalled()
      expect(deps.generateSealedSecretsKeyPair).not.toHaveBeenCalled() // Should NOT generate new key
      expect(deps.createSealedSecretsKeySecret).not.toHaveBeenCalled() // Should NOT create secret
      expect(deps.getPemFromCertificate).toHaveBeenCalledWith('existing-cert-pem')
    })

    it('should extract team names from secrets', async () => {
      const secrets = {
        teamConfig: {
          alpha: { secret: 'val' },
          beta: { secret: 'val' },
        },
      }

      const deps = {
        terminal,
        getExistingSealedSecretsCert: jest.fn().mockResolvedValue(undefined),
        generateSealedSecretsKeyPair: jest.fn().mockReturnValue({
          certificate: 'cert',
          privateKey: 'key',
        }),
        getPemFromCertificate: jest.fn().mockReturnValue('pem'),
        createSealedSecretsKeySecret: jest.fn(),
        buildSecretToNamespaceMap: jest.fn().mockResolvedValue([]),
        createSealedSecretManifest: jest.fn(),
        writeSealedSecretManifests: jest.fn(),
        encryptSecretItem: jest.fn(),
      }

      await bootstrapSealedSecrets(secrets, '/test', undefined, deps)

      expect(deps.buildSecretToNamespaceMap).toHaveBeenCalledWith(secrets, ['alpha', 'beta'], undefined)
    })
  })

  describe('APP_NAMESPACE_MAP', () => {
    it('should have expected mappings', () => {
      expect(APP_NAMESPACE_MAP['apps.harbor']).toBe('harbor')
      expect(APP_NAMESPACE_MAP['apps.gitea']).toBe('gitea')
      expect(APP_NAMESPACE_MAP['apps.oauth2-proxy']).toBe('istio-system')
      expect(APP_NAMESPACE_MAP['apps.loki']).toBe('monitoring')
      expect(APP_NAMESPACE_MAP['otomi']).toBe('otomi')
      expect(APP_NAMESPACE_MAP['dns']).toBe('external-dns')
      expect(APP_NAMESPACE_MAP['cluster']).toBe('cert-manager')
    })
  })

  describe('APP_SECRET_OVERRIDES', () => {
    it('should have gitea overrides configured', () => {
      expect(APP_SECRET_OVERRIDES['apps.gitea']).toBeDefined()
      expect(APP_SECRET_OVERRIDES['apps.gitea']).toHaveLength(2)

      const adminSecret = APP_SECRET_OVERRIDES['apps.gitea'].find((o) => o.secretName === 'gitea-admin-secret')
      expect(adminSecret).toBeDefined()
      expect(adminSecret!.namespace).toBe('gitea')
      expect(adminSecret!.data.username).toEqual({ valuePath: 'apps.gitea.adminUsername', default: 'otomi-admin' })
      expect(adminSecret!.data.password).toEqual({ valuePath: 'apps.gitea.adminPassword' })

      const dbSecret = APP_SECRET_OVERRIDES['apps.gitea'].find((o) => o.secretName === 'gitea-db-secret')
      expect(dbSecret).toBeDefined()
      expect(dbSecret!.namespace).toBe('gitea')
      expect(dbSecret!.data.username).toEqual({ static: 'gitea' })
      expect(dbSecret!.data.password).toEqual({ valuePath: 'apps.gitea.postgresqlPassword' })
    })
  })
})
