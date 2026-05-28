/**
 * Integration tests for sealed-secrets.ts — verify actual YAML files are written to disk
 * with the correct structure and content.
 *
 * These tests complement the unit tests in sealed-secrets.test.ts, which mock the filesystem.
 * Here we use a real temporary directory and verify file content after each operation.
 */
import { existsSync } from 'fs'
import { readFile, rm } from 'fs/promises'
import os from 'os'
import path from 'path'
import stubs from 'src/test-stubs'
import { parse as parseYaml } from 'yaml'
import {
  bootstrapSealedSecrets,
  buildTeamNamespaceSealedSecretMappings,
  createSealedSecretManifest,
  reconcileTeamSealedSecrets,
  SEALED_SECRETS_MANIFESTS_SUBDIR,
  writeSealedSecretManifests,
} from './sealed-secrets'

const { terminal } = stubs

// Module-level mocks needed so sealed-secrets.ts can load
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
    app: jest.fn().mockReturnValue({}),
    custom: jest.fn().mockReturnValue({}),
  },
}))

jest.mock('src/common/envalid', () => ({ env: {} }))

// Deterministic encryption — makes YAML output predictable without a real cluster
const mockEncryptSecretItem = async (_pem: string, _ns: string, value: string) => `encrypted-${value}`

const FAKE_PEM = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END PUBLIC KEY-----\n'

// ──────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────────

const baseSecrets = {
  apps: {
    harbor: { adminPassword: 'harbor-pass', secretKey: 'harbor-secret-key' },
    gitea: { adminPassword: 'gitea-pass' },
    keycloak: { idp: { clientSecret: 'kc-secret' } },
    loki: { adminPassword: 'loki-pass' },
  },
  alerts: { slack: { url: 'https://hooks.slack.com/test' } },
  smtp: { auth_password: 'smtp-pass', auth_secret: 'smtp-secret' },
  otomi: { globalPullSecret: { password: 'pull-secret-pass' } },
  teamConfig: {
    alpha: { settings: { password: 'alpha-pass' } },
    beta: { settings: { password: 'beta-pass' } },
  },
}

const baseValues = {
  teamConfig: {
    alpha: {
      settings: {
        managedMonitoring: { grafana: true, alertmanager: true },
        alerts: { receivers: ['slack'] },
      },
    },
    beta: {
      settings: {
        managedMonitoring: { grafana: false, alertmanager: false },
        alerts: { receivers: ['none'] },
      },
    },
  },
  otomi: {
    globalPullSecret: { server: 'registry.example.com', username: 'user', email: 'user@example.com' },
  },
  apps: { keycloak: { idp: { clientID: 'grafana-client' } } },
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

async function readYamlFile(filePath: string): Promise<any> {
  const content = await readFile(filePath, 'utf8')
  return parseYaml(content)
}

function sealedSecretPath(envDir: string, namespace: string, name: string): string {
  return path.join(envDir, SEALED_SECRETS_MANIFESTS_SUBDIR, namespace, 'sealedsecrets', `${name}.yaml`)
}

// ──────────────────────────────────────────────────────────────────────────────
// bootstrapSealedSecrets — file output
// ──────────────────────────────────────────────────────────────────────────────

describe('bootstrapSealedSecrets — file output', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `apl-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  function makeDeps(overrides: Partial<Parameters<typeof bootstrapSealedSecrets>[3]> = {}) {
    return {
      terminal,
      getExistingSealedSecretsCert: jest.fn().mockResolvedValue(undefined),
      generateSealedSecretsKeyPair: jest.fn().mockReturnValue({ certificate: 'cert-pem', privateKey: 'key-pem' }),
      getPemFromCertificate: jest.fn().mockReturnValue(FAKE_PEM),
      createSealedSecretsKeySecret: jest.fn().mockResolvedValue(undefined),
      buildSecretToNamespaceMap: jest.fn().mockResolvedValue([
        { namespace: 'apl-secrets', secretName: 'harbor-secrets', data: { adminPassword: 'harbor-pass' } },
        { namespace: 'apl-secrets', secretName: 'gitea-secrets', data: { adminPassword: 'gitea-pass' } },
      ]),
      buildTeamNamespaceSealedSecretMappings,
      createSealedSecretManifest,
      writeSealedSecretManifests,
      createUserSealedSecretManifests: jest.fn().mockResolvedValue([]),
      encryptSecretItem: mockEncryptSecretItem,
      ...overrides,
    }
  }

  it('creates apl-secrets SealedSecret files on disk', async () => {
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'apl-secrets', 'harbor-secrets'))).toBe(true)
    expect(existsSync(sealedSecretPath(tmpDir, 'apl-secrets', 'gitea-secrets'))).toBe(true)
  })

  it('writes valid YAML with correct SealedSecret structure', async () => {
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, makeDeps())

    const manifest = await readYamlFile(sealedSecretPath(tmpDir, 'apl-secrets', 'harbor-secrets'))

    expect(manifest.apiVersion).toBe('bitnami.com/v1alpha1')
    expect(manifest.kind).toBe('SealedSecret')
    expect(manifest.metadata.name).toBe('harbor-secrets')
    expect(manifest.metadata.namespace).toBe('apl-secrets')
    expect(manifest.spec.encryptedData).toBeDefined()
    expect(manifest.spec.template.type).toBeTruthy()
  })

  it('writes namespace-wide annotation', async () => {
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, makeDeps())

    const manifest = await readYamlFile(sealedSecretPath(tmpDir, 'apl-secrets', 'harbor-secrets'))

    expect(manifest.metadata.annotations['sealedsecrets.bitnami.com/namespace-wide']).toBe('true')
  })

  it('encrypts data keys with deterministic mock', async () => {
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, makeDeps())

    const manifest = await readYamlFile(sealedSecretPath(tmpDir, 'apl-secrets', 'harbor-secrets'))

    expect(manifest.spec.encryptedData.adminPassword).toBe('encrypted-harbor-pass')
  })

  it('creates team namespace files when grafana is enabled', async () => {
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'grafana-oidc-secret'))).toBe(true)
    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'team-alpha-grafana-admin'))).toBe(true)
    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'grafana-loki-datasource-secret'))).toBe(true)
  })

  it('does NOT create grafana files for team with grafana disabled', async () => {
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-beta', 'grafana-oidc-secret'))).toBe(false)
    expect(existsSync(sealedSecretPath(tmpDir, 'team-beta', 'team-beta-grafana-admin'))).toBe(false)
  })

  it('creates alertmanager-credentials when alertmanager enabled with receivers', async () => {
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'alertmanager-credentials'))).toBe(true)
    const manifest = await readYamlFile(sealedSecretPath(tmpDir, 'team-alpha', 'alertmanager-credentials'))
    expect(manifest.spec.encryptedData.slackUrl).toBeDefined()
  })

  it('does NOT create alertmanager-credentials when receivers is none', async () => {
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-beta', 'alertmanager-credentials'))).toBe(false)
  })

  it('creates pull secret with dockerconfigjson type', async () => {
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'otomi-pullsecret-global'))).toBe(true)
    const manifest = await readYamlFile(sealedSecretPath(tmpDir, 'team-alpha', 'otomi-pullsecret-global'))
    expect(manifest.spec.template.type).toBe('kubernetes.io/dockerconfigjson')
  })

  it('re-running is idempotent (overwrites with same content)', async () => {
    const deps = makeDeps()
    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, deps)

    const firstContent = await readFile(sealedSecretPath(tmpDir, 'apl-secrets', 'harbor-secrets'), 'utf8')

    await bootstrapSealedSecrets(baseSecrets, tmpDir, baseValues, deps)
    const secondContent = await readFile(sealedSecretPath(tmpDir, 'apl-secrets', 'harbor-secrets'), 'utf8')

    expect(firstContent).toBe(secondContent)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// reconcileTeamSealedSecrets — operator reconcile
// ──────────────────────────────────────────────────────────────────────────────

describe('reconcileTeamSealedSecrets — operator reconcile', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `apl-reconcile-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  function makeK8sSecrets(overrides: Record<string, any> = {}): Record<string, Record<string, string> | undefined> {
    return {
      'keycloak-secrets': { idp_clientSecret: 'kc-secret' },
      'loki-secrets': { adminPassword: 'loki-pass' },
      'alerts-secrets': { slack_url: 'https://hooks.slack.com/test' },
      'smtp-secrets': { auth_password: 'smtp-pass', auth_secret: 'smtp-secret' },
      'otomi-secrets': { globalPullSecret_password: 'pull-pass' },
      'team-alpha-settings-secrets': { settings_password: 'alpha-pass' },
      ...overrides,
    }
  }

  function makeGetK8sSecret(secrets: Record<string, Record<string, string> | undefined>) {
    return async (name: string, _ns: string) => secrets[name]
  }

  function makeDeps(k8sSecrets: Record<string, Record<string, string> | undefined> = makeK8sSecrets()) {
    return {
      buildAllSecretsFromK8s: async (teams: string[]) => {
        // Use real buildAllSecretsFromK8s logic with mocked getK8sSecret
        const { buildAllSecretsFromK8s: realFn } = jest.requireActual('./sealed-secrets') as any
        return realFn(teams, { getK8sSecret: makeGetK8sSecret(k8sSecrets) })
      },
      buildTeamNamespaceSealedSecretMappings,
      createSealedSecretManifest,
      writeSealedSecretManifests,
      getOrCreateSealedSecretsPem: jest.fn().mockResolvedValue(FAKE_PEM),
      encryptSecretItem: mockEncryptSecretItem,
    }
  }

  const testValues = {
    teamConfig: {
      alpha: {
        settings: {
          managedMonitoring: { grafana: true, alertmanager: false },
          alerts: { receivers: ['none'] },
        },
      },
    },
    otomi: { globalPullSecret: null },
    apps: { keycloak: { idp: { clientID: 'grafana-client' } } },
  }

  it('creates team SealedSecrets on first run with hash annotation', async () => {
    await reconcileTeamSealedSecrets(testValues, tmpDir, makeDeps())

    const filePath = sealedSecretPath(tmpDir, 'team-alpha', 'grafana-oidc-secret')
    expect(existsSync(filePath)).toBe(true)

    const manifest = await readYamlFile(filePath)
    expect(manifest.metadata.annotations['apl.io/secret-hash']).toBeDefined()
    expect(manifest.metadata.annotations['apl.io/secret-hash']).toHaveLength(16)
  })

  it('skips re-encryption when inputs are unchanged (hash match)', async () => {
    const deps = makeDeps()
    const encryptSpy = jest.fn().mockImplementation(mockEncryptSecretItem)
    deps.encryptSecretItem = encryptSpy

    // First run: creates files
    await reconcileTeamSealedSecrets(testValues, tmpDir, deps)
    const callsAfterFirst = encryptSpy.mock.calls.length

    // Second run with same values: should skip re-encryption
    await reconcileTeamSealedSecrets(testValues, tmpDir, deps)
    const callsAfterSecond = encryptSpy.mock.calls.length

    expect(callsAfterSecond).toBe(callsAfterFirst) // no new encrypt calls
  })

  it('re-encrypts when secret value changes (hash mismatch)', async () => {
    const deps = makeDeps()
    await reconcileTeamSealedSecrets(testValues, tmpDir, deps)

    const filePath = sealedSecretPath(tmpDir, 'team-alpha', 'grafana-oidc-secret')
    const firstHash = (await readYamlFile(filePath)).metadata.annotations['apl.io/secret-hash']

    // Change the secret value
    const newDeps = makeDeps(makeK8sSecrets({ 'keycloak-secrets': { idp_clientSecret: 'new-kc-secret' } }))
    await reconcileTeamSealedSecrets(testValues, tmpDir, newDeps)

    const secondHash = (await readYamlFile(filePath)).metadata.annotations['apl.io/secret-hash']
    expect(secondHash).not.toBe(firstHash)
  })

  it('creates grafana files when feature is enabled', async () => {
    await reconcileTeamSealedSecrets(testValues, tmpDir, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'grafana-oidc-secret'))).toBe(true)
    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'team-alpha-grafana-admin'))).toBe(true)
    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'grafana-loki-datasource-secret'))).toBe(true)
  })

  it('deletes grafana files when feature is disabled', async () => {
    // First run: grafana enabled
    await reconcileTeamSealedSecrets(testValues, tmpDir, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'grafana-oidc-secret'))).toBe(true)

    // Second run: grafana disabled
    const disabledValues = {
      ...testValues,
      teamConfig: {
        alpha: {
          settings: {
            managedMonitoring: { grafana: false, alertmanager: false },
            alerts: { receivers: ['none'] },
          },
        },
      },
    }
    await reconcileTeamSealedSecrets(disabledValues, tmpDir, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'grafana-oidc-secret'))).toBe(false)
    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'team-alpha-grafana-admin'))).toBe(false)
    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'grafana-loki-datasource-secret'))).toBe(false)
  })

  it('skips gracefully when PEM is unavailable (dev env)', async () => {
    const deps = makeDeps()
    deps.getOrCreateSealedSecretsPem = jest.fn().mockRejectedValue(new Error('not in cluster'))

    // Should not throw
    await expect(reconcileTeamSealedSecrets(testValues, tmpDir, deps)).resolves.toBeUndefined()
  })

  it('processes other teams when one team K8s secret read fails', async () => {
    const valuesWithTwoTeams = {
      ...testValues,
      teamConfig: {
        ...testValues.teamConfig,
        gamma: {
          settings: {
            managedMonitoring: { grafana: true, alertmanager: false },
            alerts: { receivers: ['none'] },
          },
        },
      },
    }

    // alpha secret read fails, gamma succeeds
    const partialSecrets = makeK8sSecrets({
      'team-alpha-settings-secrets': undefined, // simulates read failure
      'team-gamma-settings-secrets': { settings_password: 'gamma-pass' },
    })

    await reconcileTeamSealedSecrets(valuesWithTwoTeams, tmpDir, makeDeps(partialSecrets))

    // gamma should still have oidc secret (no dependency on team settings password)
    expect(existsSync(sealedSecretPath(tmpDir, 'team-gamma', 'grafana-oidc-secret'))).toBe(true)
  })

  it('removes files for teams that are deleted from teamConfig', async () => {
    // First run with alpha
    await reconcileTeamSealedSecrets(testValues, tmpDir, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'grafana-oidc-secret'))).toBe(true)

    // Second run with no teams
    await reconcileTeamSealedSecrets({ teamConfig: {} }, tmpDir, makeDeps())

    expect(existsSync(sealedSecretPath(tmpDir, 'team-alpha', 'grafana-oidc-secret'))).toBe(false)
  })
})
