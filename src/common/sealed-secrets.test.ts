import { pki } from 'node-forge'
import stubs from 'src/test-stubs'
import {
  APP_NAMESPACE_MAP,
  bootstrapSealedSecrets,
  buildSecretToNamespaceMap,
  createSealedSecretManifest,
  createSealedSecretsKeySecret,
  generateSealedSecretsKeyPair,
  getPemFromCertificate,
  SECRET_NAME_MAP,
  stripAllSecrets,
  writeSealedSecretManifests,
} from './sealed-secrets'

const { terminal } = stubs

jest.mock('@linode/kubeseal-encrypt', () => ({
  encryptSecretItem: jest.fn().mockResolvedValue('encrypted-value'),
}))

jest.mock('src/common/k8s', () => ({
  getK8sSecret: jest.fn().mockResolvedValue(undefined),
  ensureNamespaceExists: jest.fn().mockResolvedValue(undefined),
  b64enc: jest.fn((v: string) => Buffer.from(v).toString('base64')),
  k8s: {
    core: jest.fn().mockReturnValue({
      createNamespacedSecret: jest.fn().mockResolvedValue({}),
    }),
    app: jest.fn().mockReturnValue({
      patchNamespacedDeployment: jest.fn().mockResolvedValue({}),
      readNamespacedDeployment: jest
        .fn()
        .mockResolvedValue({ spec: { replicas: 1 }, status: { updatedReplicas: 1, availableReplicas: 1 } }),
    }),
    custom: jest.fn().mockReturnValue({
      createNamespacedCustomObject: jest.fn().mockResolvedValue({}),
      patchNamespacedCustomObject: jest.fn().mockResolvedValue({}),
    }),
  },
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
      const mockGetK8sSecret = jest.fn().mockResolvedValue(undefined)
      const deps = {
        getK8sSecret: mockGetK8sSecret,
        terminal,
      }

      await createSealedSecretsKeySecret('cert-pem', 'key-pem', deps)

      expect(mockGetK8sSecret).toHaveBeenCalledWith('sealed-secrets-key', 'sealed-secrets')
    })

    it('should skip creation if secret already exists', async () => {
      const mockGetK8sSecret = jest.fn().mockResolvedValue({ 'tls.crt': 'existing-cert' })
      const deps = {
        getK8sSecret: mockGetK8sSecret,
        terminal,
      }

      await createSealedSecretsKeySecret('cert-pem', 'key-pem', deps)

      expect(mockGetK8sSecret).toHaveBeenCalledWith('sealed-secrets-key', 'sealed-secrets')
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

      // All secrets now go to apl-secrets namespace
      const harborMapping = result.find((m) => m.secretName === 'harbor-secrets')
      expect(harborMapping).toBeDefined()
      expect(harborMapping!.namespace).toBe('apl-secrets')
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
      expect(result[0].namespace).toBe('apl-secrets')
    })

    it('should serialize users array as single JSON value in users-secrets', async () => {
      const secrets = {
        users: [
          {
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            initialPassword: 'pass',
            groups: ['platform-admin'],
          },
        ],
        apps: { harbor: { adminPassword: 'pass' } },
      }
      const deps = {
        getSchemaSecretsPaths: jest.fn().mockResolvedValue(['users', 'apps.harbor.adminPassword']),
      }

      const result = await buildSecretToNamespaceMap(secrets, [], undefined, deps)

      expect(result).toHaveLength(2)
      const usersMapping = result.find((m) => m.secretName === 'users-secrets')
      expect(usersMapping).toBeDefined()
      expect(usersMapping!.namespace).toBe('apl-secrets')
      expect(usersMapping!.data.usersJson).toBe(JSON.stringify(secrets.users))
    })

    it('should handle teamConfig dynamic paths in apl-secrets namespace', async () => {
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
      expect(result[0].namespace).toBe('apl-secrets')
      expect(result[0].secretName).toBe('team-team-alpha-settings-secrets')
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

    it('should put gitea secrets in apl-secrets namespace using convention naming', async () => {
      const secrets = {
        apps: {
          gitea: { adminPassword: 'gitea-pass', postgresqlPassword: 'pg-pass' },
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

      const result = await buildSecretToNamespaceMap(secrets, [], undefined, deps)

      // Harbor should use convention naming in apl-secrets ns
      const harborMapping = result.find((m) => m.secretName === 'harbor-secrets')
      expect(harborMapping).toBeDefined()
      expect(harborMapping!.namespace).toBe('apl-secrets')
      expect(harborMapping!.data).toHaveProperty('adminPassword', 'harbor-pass')

      // Gitea should have a gitea-secrets mapping in apl-secrets ns
      const giteaMapping = result.find((m) => m.secretName === 'gitea-secrets')
      expect(giteaMapping).toBeDefined()
      expect(giteaMapping!.namespace).toBe('apl-secrets')
      expect(giteaMapping!.data).toHaveProperty('adminPassword', 'gitea-pass')
      expect(giteaMapping!.data).toHaveProperty('postgresqlPassword', 'pg-pass')
    })
  })

  describe('createSealedSecretManifest', () => {
    it('should produce correct SealedSecret structure', async () => {
      const mapping = {
        namespace: 'apl-secrets',
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
      expect(result.metadata.namespace).toBe('apl-secrets')
      expect(result.metadata.annotations['sealedsecrets.bitnami.com/namespace-wide']).toBe('true')
      expect(result.spec.encryptedData.adminPassword).toBe('encrypted-value')
      expect(result.spec.encryptedData.secretKey).toBe('encrypted-value')
      expect(result.spec.template.type).toBe('Opaque')
      expect(result.spec.template.metadata.name).toBe('harbor-secrets')
      expect(result.spec.template.metadata.namespace).toBe('apl-secrets')
    })

    it('should call encryptSecretItem for each data key', async () => {
      const mapping = {
        namespace: 'apl-secrets',
        secretName: 'gitea-secrets',
        data: { key1: 'val1', key2: 'val2', key3: 'val3' },
      }
      const deps = {
        encryptSecretItem: jest.fn().mockResolvedValue('enc'),
      }

      await createSealedSecretManifest('pem', mapping, deps)

      expect(deps.encryptSecretItem).toHaveBeenCalledTimes(3)
      expect(deps.encryptSecretItem).toHaveBeenCalledWith('pem', 'apl-secrets', 'val1')
      expect(deps.encryptSecretItem).toHaveBeenCalledWith('pem', 'apl-secrets', 'val2')
      expect(deps.encryptSecretItem).toHaveBeenCalledWith('pem', 'apl-secrets', 'val3')
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
            namespace: 'apl-secrets',
          },
          spec: {
            encryptedData: { key: 'enc' },
            template: {
              immutable: false,
              metadata: { name: 'harbor-secrets', namespace: 'apl-secrets' },
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

      expect(deps.mkdir).toHaveBeenCalledWith('/test/env/manifests/ns/apl-secrets', { recursive: true })
      expect(deps.writeFile).toHaveBeenCalledWith(
        '/test/env/manifests/ns/apl-secrets/harbor-secrets.yaml',
        'yaml-content',
      )
    })
  })

  describe('bootstrapSealedSecrets', () => {
    it('should generate new key pair when no existing cert found', async () => {
      const secrets = {
        apps: { harbor: { adminPassword: 'pass' } },
      }
      const mockMapping = {
        namespace: 'apl-secrets',
        secretName: 'harbor-secrets',
        data: { adminPassword: 'pass' },
      }
      const mockManifest = {
        apiVersion: 'bitnami.com/v1alpha1',
        kind: 'SealedSecret',
        metadata: {
          annotations: { 'sealedsecrets.bitnami.com/namespace-wide': 'true' },
          name: 'harbor-secrets',
          namespace: 'apl-secrets',
        },
        spec: {
          encryptedData: { adminPassword: 'encrypted' },
          template: {
            immutable: false,
            metadata: { name: 'harbor-secrets', namespace: 'apl-secrets' },
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
        namespace: 'apl-secrets',
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

  describe('SECRET_NAME_MAP', () => {
    it('should have expected secret name mappings', () => {
      expect(SECRET_NAME_MAP['apps.harbor']).toBe('harbor-secrets')
      expect(SECRET_NAME_MAP['apps.gitea']).toBe('gitea-secrets')
      expect(SECRET_NAME_MAP['apps.keycloak']).toBe('keycloak-secrets')
      expect(SECRET_NAME_MAP['otomi']).toBe('otomi-platform-secrets')
      expect(SECRET_NAME_MAP['oidc']).toBe('oidc-secrets')
      expect(SECRET_NAME_MAP['dns']).toBe('dns-secrets')
    })
  })

  describe('stripAllSecrets', () => {
    it('should remove all secret paths from values', () => {
      const values = {
        apps: {
          gitea: { adminPassword: 'secret', postgresqlPassword: 'pg-secret', resources: { cpu: '100m' } },
        },
        oidc: { clientID: 'otomi', clientSecret: 'my-secret', issuer: 'https://example.com' },
      }
      const secretPaths = ['apps.gitea.adminPassword', 'apps.gitea.postgresqlPassword', 'oidc.clientSecret']

      const result = stripAllSecrets(values, secretPaths)

      // Secret values should be removed
      expect(result.apps.gitea.adminPassword).toBeUndefined()
      expect(result.apps.gitea.postgresqlPassword).toBeUndefined()
      expect(result.oidc.clientSecret).toBeUndefined()
      // Non-secret values should be preserved
      expect(result.apps.gitea.resources).toEqual({ cpu: '100m' })
      expect(result.oidc.clientID).toBe('otomi')
      expect(result.oidc.issuer).toBe('https://example.com')
    })

    it('should not modify the original values object', () => {
      const values = {
        apps: { gitea: { adminPassword: 'secret' } },
      }
      const secretPaths = ['apps.gitea.adminPassword']

      stripAllSecrets(values, secretPaths)

      expect(values.apps.gitea.adminPassword).toBe('secret')
    })
  })
})
