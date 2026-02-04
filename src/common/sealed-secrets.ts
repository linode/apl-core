import { encryptSecretItem } from '@linode/kubeseal-encrypt'
import { X509Certificate } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { get } from 'lodash'
import { pki } from 'node-forge'
import { terminal } from 'src/common/debug'
import { flattenObject, getSchemaSecretsPaths } from 'src/common/utils'
import { objectToYaml } from 'src/common/values'
import { $ } from 'zx'

const cmdName = 'sealed-secrets'

export interface SecretMapping {
  namespace: string
  secretName: string
  data: Record<string, string>
}

export interface SealedSecretManifest {
  apiVersion: string
  kind: string
  metadata: {
    annotations: Record<string, string>
    name: string
    namespace: string
  }
  spec: {
    encryptedData: Record<string, string>
    template: {
      immutable: boolean
      metadata: { name: string; namespace: string }
      type: string
    }
  }
}

/**
 * Mapping from secret path prefix to target Kubernetes namespace.
 * Dynamic entries like `teamConfig.{teamId}` are handled separately.
 */
export const APP_NAMESPACE_MAP: Record<string, string> = {
  'apps.harbor': 'harbor',
  'apps.gitea': 'gitea',
  'apps.keycloak': 'keycloak',
  'apps.grafana': 'grafana',
  'apps.loki': 'monitoring',
  'apps.oauth2-proxy': 'istio-system',
  'apps.oauth2-proxy-redis': 'istio-system',
  'apps.prometheus': 'monitoring',
  'apps.otomi-api': 'otomi',
  'apps.cert-manager': 'cert-manager',
  'apps.kubeflow-pipelines': 'kfp',
  otomi: 'otomi',
  oidc: 'otomi',
  smtp: 'otomi',
  dns: 'external-dns',
  obj: 'otomi',
  license: 'otomi',
  users: 'keycloak',
  alerts: 'monitoring',
  cluster: 'cert-manager',
}

/**
 * Generate an RSA 4096-bit key pair and self-signed X.509 certificate for Sealed Secrets.
 * Follows the pattern from createCustomCA() in bootstrap.ts.
 */
export const generateSealedSecretsKeyPair = (deps = { terminal, pki }): { certificate: string; privateKey: string } => {
  const d = deps.terminal(`common:${cmdName}:generateSealedSecretsKeyPair`)
  d.info('Generating sealed-secrets RSA key pair')

  const keys = deps.pki.rsa.generateKeyPair(4096)
  const cert = deps.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = '01'
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10)

  const attrs = [
    { name: 'countryName', value: 'NL' },
    { shortName: 'ST', value: 'Utrecht' },
    { name: 'localityName', value: 'Utrecht' },
    { name: 'organizationName', value: 'APL' },
    { shortName: 'OU', value: 'SealedSecrets' },
  ]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      keyEncipherment: true,
    },
  ])
  cert.sign(keys.privateKey)

  const certificate = deps.pki.certificateToPem(cert).replaceAll('\r\n', '\n')
  const privateKey = deps.pki.privateKeyToPem(keys.privateKey).replaceAll('\r\n', '\n')

  d.info('Generated sealed-secrets key pair')
  return { certificate, privateKey }
}

/**
 * Extract SPKI PEM public key from a PEM-encoded X.509 certificate.
 * Uses Node.js crypto.X509Certificate (same approach as getSealedSecretsPEM() in k8s.ts).
 */
export const getPemFromCertificate = (certificate: string): string => {
  const x509 = new X509Certificate(certificate)
  const exported = x509.publicKey.export({ format: 'pem', type: 'spki' })
  return typeof exported === 'string' ? exported : exported.toString('utf-8')
}

/**
 * Create the sealed-secrets namespace and TLS secret in Kubernetes.
 * The controller will pick up this pre-created key on startup.
 */
export const createSealedSecretsKeySecret = async (
  certificate: string,
  privateKey: string,
  deps = { $, terminal, writeFile, mkdir },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:createSealedSecretsKeySecret`)
  d.info('Creating sealed-secrets namespace and TLS secret')

  // Create namespace
  await deps.$`kubectl create namespace sealed-secrets --dry-run=client -o yaml | kubectl apply -f -`.nothrow().quiet()

  // Write temp files for kubectl create secret tls
  const tmpDir = '/tmp/sealed-secrets-bootstrap'
  await deps.mkdir(tmpDir, { recursive: true })
  const certPath = `${tmpDir}/tls.crt`
  const keyPath = `${tmpDir}/tls.key`
  await deps.writeFile(certPath, certificate)
  await deps.writeFile(keyPath, privateKey)

  // Create the TLS secret
  const result =
    await deps.$`kubectl create secret tls sealed-secrets-key -n sealed-secrets --cert=${certPath} --key=${keyPath} --dry-run=client -o yaml | kubectl apply -f -`
      .nothrow()
      .quiet()
  if (result.stderr) d.error(result.stderr)

  // Label the secret so the controller picks it up
  const labelResult =
    await deps.$`kubectl label secret sealed-secrets-key -n sealed-secrets sealedsecrets.bitnami.com/sealed-secrets-key=active --overwrite`
      .nothrow()
      .quiet()
  if (labelResult.stderr) d.error(labelResult.stderr)

  d.info('Created sealed-secrets TLS secret with key label')
}

/**
 * Resolve the namespace for a given secret path using APP_NAMESPACE_MAP.
 * Handles dynamic teamConfig paths.
 */
const resolveNamespace = (secretPath: string): string | undefined => {
  // Check for teamConfig dynamic paths
  const teamMatch = secretPath.match(/^teamConfig\.([^.]+)/)
  if (teamMatch) {
    return `team-${teamMatch[1]}`
  }

  // Find the longest matching prefix in APP_NAMESPACE_MAP
  const sortedKeys = Object.keys(APP_NAMESPACE_MAP).sort((a, b) => b.length - a.length)
  for (const prefix of sortedKeys) {
    if (secretPath === prefix || secretPath.startsWith(`${prefix}.`)) {
      return APP_NAMESPACE_MAP[prefix]
    }
  }

  return undefined
}

/**
 * Derive a K8s secret name from the secret path prefix.
 */
const deriveSecretName = (secretPath: string): string => {
  const teamMatch = secretPath.match(/^teamConfig\.([^.]+)/)
  if (teamMatch) {
    return 'team-settings-secrets'
  }

  // Map specific path prefixes to secret names
  const nameMap: Record<string, string> = {
    'apps.harbor': 'harbor-secrets',
    'apps.gitea': 'gitea-secrets',
    'apps.keycloak': 'keycloak-secrets',
    'apps.grafana': 'grafana-secrets',
    'apps.loki': 'loki-secrets',
    'apps.oauth2-proxy': 'oauth2-proxy-secrets',
    'apps.oauth2-proxy-redis': 'oauth2-proxy-redis-secrets',
    'apps.prometheus': 'prometheus-secrets',
    'apps.otomi-api': 'otomi-api-secrets',
    'apps.cert-manager': 'cert-manager-secrets',
    'apps.kubeflow-pipelines': 'kubeflow-pipelines-secrets',
    otomi: 'otomi-platform-secrets',
    oidc: 'oidc-secrets',
    smtp: 'smtp-secrets',
    dns: 'dns-secrets',
    obj: 'obj-storage-secrets',
    license: 'license-secrets',
    users: 'users-secrets',
    alerts: 'alerts-secrets',
    cluster: 'cluster-secrets',
  }

  const sortedKeys = Object.keys(nameMap).sort((a, b) => b.length - a.length)
  for (const prefix of sortedKeys) {
    if (secretPath === prefix || secretPath.startsWith(`${prefix}.`)) {
      return nameMap[prefix]
    }
  }

  // Fallback: derive from first two path segments
  const parts = secretPath.split('.')
  return `${parts.slice(0, 2).join('-')}-secrets`
}

/**
 * Build a mapping from secrets to their target namespaces and K8s secret names.
 * Groups secret paths by namespace and secret name.
 */
export const buildSecretToNamespaceMap = async (
  secrets: Record<string, any>,
  teams: string[],
  deps = { getSchemaSecretsPaths },
): Promise<SecretMapping[]> => {
  const secretPaths = await deps.getSchemaSecretsPaths(teams)
  const flat = flattenObject(secrets)

  // Group by namespace + secretName
  const groupMap = new Map<string, SecretMapping>()

  for (const secretPath of secretPaths) {
    // Skip SOPS-related paths
    if (secretPath.startsWith('kms.sops')) continue
    // Skip 'users' path — not a simple key-value secret
    if (secretPath === 'users') continue

    const namespace = resolveNamespace(secretPath)
    if (!namespace) continue

    const secretName = deriveSecretName(secretPath)
    const groupKey = `${namespace}/${secretName}`

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { namespace, secretName, data: {} })
    }

    const mapping = groupMap.get(groupKey)!

    // Find all flat keys that match this secret path
    for (const [flatKey, value] of Object.entries(flat)) {
      if (flatKey === secretPath || flatKey.startsWith(`${secretPath}.`)) {
        // Use the leaf key name as the data key
        const dataKey = flatKey.replace(/\./g, '_')
        if (value !== undefined && value !== null && value !== '') {
          mapping.data[dataKey] = String(value)
        }
      }
    }
  }

  // Filter out empty mappings
  return Array.from(groupMap.values()).filter((m) => Object.keys(m.data).length > 0)
}

/**
 * Create a SealedSecret manifest by encrypting each data value.
 * Follows the pattern from createCatalogSealedSecret() in migrate.ts.
 */
export const createSealedSecretManifest = async (
  pem: string,
  mapping: SecretMapping,
  deps = { encryptSecretItem },
): Promise<SealedSecretManifest> => {
  const encryptedData: Record<string, string> = {}
  for (const [key, value] of Object.entries(mapping.data)) {
    encryptedData[key] = await deps.encryptSecretItem(pem, mapping.namespace, value)
  }

  return {
    apiVersion: 'bitnami.com/v1alpha1',
    kind: 'SealedSecret',
    metadata: {
      annotations: { 'sealedsecrets.bitnami.com/namespace-wide': 'true' },
      name: mapping.secretName,
      namespace: mapping.namespace,
    },
    spec: {
      encryptedData,
      template: {
        immutable: false,
        metadata: { name: mapping.secretName, namespace: mapping.namespace },
        type: 'Opaque',
      },
    },
  }
}

/**
 * Write SealedSecret manifests to the env/sealedsecrets directory.
 */
export const writeSealedSecretManifests = async (
  manifests: SealedSecretManifest[],
  envDir: string,
  deps = { mkdir, writeFile, objectToYaml, terminal },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:writeSealedSecretManifests`)

  for (const manifest of manifests) {
    const dir = `${envDir}/env/sealedsecrets/${manifest.metadata.namespace}`
    await deps.mkdir(dir, { recursive: true })
    const filePath = `${dir}/${manifest.metadata.name}.yaml`
    d.info(`Writing sealed secret to ${filePath}`)
    await deps.writeFile(filePath, deps.objectToYaml(manifest))
  }
}

/**
 * Orchestrator: bootstrap sealed secrets for the platform.
 * Replaces bootstrapSops().
 */
export const bootstrapSealedSecrets = async (
  secrets: Record<string, any>,
  envDir: string,
  deps = {
    terminal,
    generateSealedSecretsKeyPair,
    getPemFromCertificate,
    createSealedSecretsKeySecret,
    buildSecretToNamespaceMap,
    createSealedSecretManifest,
    writeSealedSecretManifests,
    encryptSecretItem,
  },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:bootstrapSealedSecrets`)
  d.info('Bootstrapping sealed secrets')

  // 1. Generate RSA key pair + self-signed X.509 certificate
  const { certificate, privateKey } = deps.generateSealedSecretsKeyPair()

  // 2 & 3. Create namespace and store key pair as K8s TLS secret
  await deps.createSealedSecretsKeySecret(certificate, privateKey)

  // 4. Extract SPKI PEM public key from certificate
  const pem = deps.getPemFromCertificate(certificate)

  // 5. Build secret-to-namespace mapping
  const teams = Object.keys(get(secrets, 'teamConfig', {}) as Record<string, unknown>)
  const mappings = await deps.buildSecretToNamespaceMap(secrets, teams)

  // 6. Create SealedSecret manifests
  const manifests: SealedSecretManifest[] = []
  for (const mapping of mappings) {
    const manifest = await deps.createSealedSecretManifest(pem, mapping, {
      encryptSecretItem: deps.encryptSecretItem,
    })
    manifests.push(manifest)
  }

  // 7. Write SealedSecret manifests to disk
  await deps.writeSealedSecretManifests(manifests, envDir)

  d.info(`Bootstrapped ${manifests.length} sealed secret manifests`)
}
