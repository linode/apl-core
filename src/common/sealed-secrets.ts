import { encryptSecretItem } from '@linode/kubeseal-encrypt'
import { X509Certificate } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { get } from 'lodash'
import { pki } from 'node-forge'
import { join } from 'path'
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
 * Per-app secret override configuration.
 * When an app requires specific K8s Secret names and key layouts
 * (e.g. gitea expects `gitea-admin-secret` with `username`/`password` keys),
 * define overrides here instead of using the default `{app}-secrets` convention.
 */
interface SecretOverrideEntry {
  secretName: string
  namespace: string
  data: Record<string, { valuePath: string; default?: string } | { static: string }>
}

export const APP_SECRET_OVERRIDES: Record<string, SecretOverrideEntry[]> = {
  'apps.gitea': [
    {
      secretName: 'gitea-admin-secret',
      namespace: 'gitea',
      data: {
        username: { valuePath: 'apps.gitea.adminUsername', default: 'otomi-admin' },
        password: { valuePath: 'apps.gitea.adminPassword' },
      },
    },
    {
      secretName: 'gitea-db-secret',
      namespace: 'gitea',
      data: {
        username: { static: 'gitea' },
        password: { valuePath: 'apps.gitea.postgresqlPassword' },
      },
    },
  ],
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
 * Get the existing sealed-secrets certificate from the cluster if it exists.
 * Returns the certificate PEM string or undefined if not found.
 */
export const getExistingSealedSecretsCert = async (deps = { $, terminal }): Promise<string | undefined> => {
  const d = deps.terminal(`common:${cmdName}:getExistingSealedSecretsCert`)

  const result =
    await deps.$`kubectl get secret sealed-secrets-key -n sealed-secrets -o jsonpath='{.data.tls\\.crt}' 2>/dev/null`
      .nothrow()
      .quiet()

  if (result.exitCode !== 0 || !result.stdout || result.stdout === '') {
    d.info('No existing sealed-secrets-key found')
    return undefined
  }

  try {
    const certBase64 = result.stdout.replace(/'/g, '')
    const cert = Buffer.from(certBase64, 'base64').toString('utf-8')
    d.info('Found existing sealed-secrets-key certificate')
    return cert
  } catch {
    d.warn('Failed to decode existing certificate')
    return undefined
  }
}

/**
 * Create the sealed-secrets namespace and TLS secret in Kubernetes.
 * The controller will pick up this pre-created key on startup.
 * IMPORTANT: This only creates the secret if it doesn't already exist.
 */
export const createSealedSecretsKeySecret = async (
  certificate: string,
  privateKey: string,
  deps = { $, terminal, writeFile, mkdir },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:createSealedSecretsKeySecret`)

  // Create namespace
  await deps.$`kubectl create namespace sealed-secrets --dry-run=client -o yaml | kubectl apply -f -`.nothrow().quiet()

  // Check if secret already exists
  const existingSecret = await deps.$`kubectl get secret sealed-secrets-key -n sealed-secrets`.nothrow().quiet()
  if (existingSecret.exitCode === 0) {
    d.info('sealed-secrets-key already exists, skipping creation')
    return
  }

  d.info('Creating sealed-secrets TLS secret')

  // Write temp files for kubectl create secret tls
  const tmpDir = '/tmp/sealed-secrets-bootstrap'
  await deps.mkdir(tmpDir, { recursive: true })
  const certPath = `${tmpDir}/tls.crt`
  const keyPath = `${tmpDir}/tls.key`
  await deps.writeFile(certPath, certificate)
  await deps.writeFile(keyPath, privateKey)

  // Create the TLS secret (only if it doesn't exist)
  const result =
    await deps.$`kubectl create secret tls sealed-secrets-key -n sealed-secrets --cert=${certPath} --key=${keyPath}`
      .nothrow()
      .quiet()
  if (result.exitCode !== 0) {
    d.error(`Failed to create sealed-secrets-key: ${result.stderr}`)
    return
  }

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

// Map specific path prefixes to secret names
const SECRET_NAME_MAP: Record<string, string> = {
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

/**
 * Find the group prefix for a secret path.
 * Returns the prefix that maps to the secret name (e.g., 'apps.harbor' for 'apps.harbor.adminPassword').
 */
const findGroupPrefix = (secretPath: string): string | undefined => {
  const teamMatch = secretPath.match(/^teamConfig\.([^.]+)/)
  if (teamMatch) {
    return `teamConfig.${teamMatch[1]}`
  }

  const sortedKeys = Object.keys(SECRET_NAME_MAP).sort((a, b) => b.length - a.length)
  for (const prefix of sortedKeys) {
    if (secretPath === prefix || secretPath.startsWith(`${prefix}.`)) {
      return prefix
    }
  }

  // Fallback: use first two path segments
  const parts = secretPath.split('.')
  if (parts.length >= 2) {
    return parts.slice(0, 2).join('.')
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

  const sortedKeys = Object.keys(SECRET_NAME_MAP).sort((a, b) => b.length - a.length)
  for (const prefix of sortedKeys) {
    if (secretPath === prefix || secretPath.startsWith(`${prefix}.`)) {
      return SECRET_NAME_MAP[prefix]
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
  allValues?: Record<string, any>,
  deps = { getSchemaSecretsPaths },
): Promise<SecretMapping[]> => {
  const secretPaths = await deps.getSchemaSecretsPaths(teams)
  const flat = flattenObject(secrets)
  const allFlat = allValues ? flattenObject(allValues) : flat

  // Group by namespace + secretName
  const groupMap = new Map<string, SecretMapping>()

  // Determine which secret path prefixes have overrides
  const overriddenPrefixes = Object.keys(APP_SECRET_OVERRIDES)

  for (const secretPath of secretPaths) {
    // Skip SOPS-related paths
    if (secretPath.startsWith('kms.sops')) continue
    // Skip 'users' path — not a simple key-value secret
    if (secretPath === 'users') continue
    // Skip overridden prefixes — they are handled separately below
    if (overriddenPrefixes.some((p) => secretPath === p || secretPath.startsWith(`${p}.`))) continue

    const namespace = resolveNamespace(secretPath)
    if (!namespace) continue

    const secretName = deriveSecretName(secretPath)
    const groupKey = `${namespace}/${secretName}`

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { namespace, secretName, data: {} })
    }

    const mapping = groupMap.get(groupKey)!

    // Find the group prefix (e.g., 'apps.harbor' for 'apps.harbor.adminPassword')
    const groupPrefix = findGroupPrefix(secretPath)

    // Find all flat keys that match this secret path
    for (const [flatKey, value] of Object.entries(flat)) {
      if (flatKey === secretPath || flatKey.startsWith(`${secretPath}.`)) {
        // Use leaf key: strip the group prefix to get relative path
        const relativePath =
          groupPrefix && (flatKey === groupPrefix || flatKey.startsWith(`${groupPrefix}.`))
            ? flatKey.slice(groupPrefix.length + 1)
            : flatKey
        const dataKey = relativePath.replace(/\./g, '_')
        if (value !== undefined && value !== null && value !== '') {
          mapping.data[dataKey] = String(value)
        }
      }
    }
  }

  // Process APP_SECRET_OVERRIDES
  for (const [, overrides] of Object.entries(APP_SECRET_OVERRIDES)) {
    for (const override of overrides) {
      const data: Record<string, string> = {}
      let hasValuePathData = false

      // First pass: collect valuePath data and track if any actual values were found
      const pendingDefaults: Array<{ key: string; defaultValue: string }> = []
      for (const [key, source] of Object.entries(override.data)) {
        if (!('static' in source)) {
          const value = allFlat[source.valuePath]
          if (value !== undefined && value !== null && value !== '') {
            data[key] = String(value)
            hasValuePathData = true
          } else if (source.default !== undefined) {
            // Queue default value - will be added only if we have at least one actual value
            pendingDefaults.push({ key, defaultValue: source.default })
          }
        }
      }

      // Only add defaults and static values if we have at least one actual valuePath value
      if (hasValuePathData) {
        // Add pending defaults
        for (const { key, defaultValue } of pendingDefaults) {
          if (!(key in data)) {
            data[key] = defaultValue
          }
        }
        // Add static values
        for (const [key, source] of Object.entries(override.data)) {
          if ('static' in source) {
            data[key] = source.static
          }
        }
      }

      if (Object.keys(data).length > 0) {
        groupMap.set(`${override.namespace}/${override.secretName}`, {
          namespace: override.namespace,
          secretName: override.secretName,
          data,
        })
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
 * Write SealedSecret manifests to the env/manifests/ns directory.
 */
export const writeSealedSecretManifests = async (
  manifests: SealedSecretManifest[],
  envDir: string,
  deps = { mkdir, writeFile, objectToYaml, terminal },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:writeSealedSecretManifests`)

  for (const manifest of manifests) {
    // /env/manifests/ns/argocd/
    const dir = `${envDir}/env/manifests/ns/${manifest.metadata.namespace}`
    await deps.mkdir(dir, { recursive: true })
    const filePath = `${dir}/${manifest.metadata.name}.yaml`
    d.info(`Writing sealed secret to ${filePath}`)
    await deps.writeFile(filePath, deps.objectToYaml(manifest))
  }
}

/**
 * Apply SealedSecret manifests to the Kubernetes cluster.
 * Creates namespaces if needed and applies the SealedSecret resources.
 */
export const applySealedSecretManifests = async (
  manifests: SealedSecretManifest[],
  deps = { $, terminal, objectToYaml },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:applySealedSecretManifests`)

  // Group manifests by namespace
  const byNamespace = new Map<string, SealedSecretManifest[]>()
  for (const manifest of manifests) {
    const ns = manifest.metadata.namespace
    if (!byNamespace.has(ns)) {
      byNamespace.set(ns, [])
    }
    byNamespace.get(ns)!.push(manifest)
  }

  // Ensure namespaces exist and apply manifests
  for (const [namespace, nsManifests] of byNamespace) {
    d.info(`Ensuring namespace ${namespace} exists`)
    await deps.$`kubectl create namespace ${namespace} --dry-run=client -o yaml | kubectl apply -f -`.nothrow().quiet()

    for (const manifest of nsManifests) {
      d.info(`Applying SealedSecret ${manifest.metadata.name} to namespace ${namespace}`)
      const yaml = deps.objectToYaml(manifest)
      const result = await deps.$`echo ${yaml} | kubectl apply -f -`.nothrow().quiet()
      if (result.exitCode !== 0) {
        d.error(`Failed to apply SealedSecret ${manifest.metadata.name}: ${result.stderr}`)
      }
    }
  }

  d.info(`Applied ${manifests.length} SealedSecret manifests to cluster`)
}

/**
 * Read and apply all SealedSecret manifests from the env/manifests/ns directory.
 * This should be called during install, after the sealed-secrets controller is deployed.
 */
export const applySealedSecretManifestsFromDir = async (
  envDir: string,
  deps = { $, terminal, readdir, readFile, existsSync },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:applySealedSecretManifestsFromDir`)
  const manifestsDir = join(envDir, 'env/manifests/ns')

  if (!deps.existsSync(manifestsDir)) {
    d.info(`No SealedSecret manifests directory found at ${manifestsDir}`)
    return
  }

  d.info(`Applying SealedSecret manifests from ${manifestsDir}`)

  // Read all namespace directories
  const namespaces = await deps.readdir(manifestsDir, { withFileTypes: true })
  let appliedCount = 0

  for (const nsEntry of namespaces) {
    if (!nsEntry.isDirectory()) continue
    const namespace = nsEntry.name
    const nsDir = join(manifestsDir, namespace)

    // Ensure namespace exists
    d.info(`Ensuring namespace ${namespace} exists`)
    await deps.$`kubectl create namespace ${namespace} --dry-run=client -o yaml | kubectl apply -f -`.nothrow().quiet()

    // Read all YAML files in the namespace directory
    const files = await deps.readdir(nsDir)
    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
      const filePath = join(nsDir, file)
      d.info(`Applying SealedSecret from ${filePath}`)

      const result = await deps.$`kubectl apply -f ${filePath}`.nothrow().quiet()
      if (result.exitCode !== 0) {
        d.error(`Failed to apply SealedSecret from ${filePath}: ${result.stderr}`)
      } else {
        appliedCount += 1
      }
    }
  }

  d.info(`Applied ${appliedCount} SealedSecret manifests from directory`)
}

/**
 * Restart the sealed-secrets controller to ensure it uses the correct key.
 * This is needed because if the controller starts before the sealed-secrets-key secret exists,
 * it will generate its own key. Restarting forces it to pick up the existing key.
 */
export const restartSealedSecretsController = async (deps = { $, terminal }): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:restartSealedSecretsController`)
  d.info('Restarting sealed-secrets controller to ensure correct key is used')

  const result = await deps.$`kubectl rollout restart deployment/sealed-secrets -n sealed-secrets`.nothrow().quiet()
  if (result.exitCode !== 0) {
    d.warn(`Failed to restart sealed-secrets controller: ${result.stderr}`)
    return
  }

  d.info('Waiting for sealed-secrets controller rollout')
  const waitResult = await deps.$`kubectl rollout status deployment/sealed-secrets -n sealed-secrets --timeout=120s`
    .nothrow()
    .quiet()
  if (waitResult.exitCode !== 0) {
    d.warn(`Rollout status check failed: ${waitResult.stderr}`)
  } else {
    d.info('Sealed-secrets controller restarted successfully')
  }
}

/**
 * Orchestrator: bootstrap sealed secrets for the platform.
 * Replaces bootstrapSops().
 */
export const bootstrapSealedSecrets = async (
  secrets: Record<string, any>,
  envDir: string,
  allValues?: Record<string, any>,
  deps = {
    terminal,
    generateSealedSecretsKeyPair,
    getPemFromCertificate,
    createSealedSecretsKeySecret,
    getExistingSealedSecretsCert,
    buildSecretToNamespaceMap,
    createSealedSecretManifest,
    writeSealedSecretManifests,
    encryptSecretItem,
  },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:bootstrapSealedSecrets`)
  d.info('Bootstrapping sealed secrets')

  // 1. Check if there's an existing sealed-secrets key in the cluster
  const existingCert = await deps.getExistingSealedSecretsCert()

  let pem: string
  if (existingCert) {
    // Use existing certificate for encryption
    d.info('Using existing sealed-secrets certificate')
    pem = deps.getPemFromCertificate(existingCert)
  } else {
    // Generate new key pair and create the secret
    d.info('Generating new sealed-secrets key pair')
    const { certificate, privateKey } = deps.generateSealedSecretsKeyPair()
    await deps.createSealedSecretsKeySecret(certificate, privateKey)
    pem = deps.getPemFromCertificate(certificate)
  }

  // 5. Build secret-to-namespace mapping
  const teams = Object.keys(get(secrets, 'teamConfig', {}) as Record<string, unknown>)
  const mappings = await deps.buildSecretToNamespaceMap(secrets, teams, allValues)

  // 6. Create SealedSecret manifests
  const manifests: SealedSecretManifest[] = []
  for (const mapping of mappings) {
    const manifest = await deps.createSealedSecretManifest(pem, mapping, {
      encryptSecretItem: deps.encryptSecretItem,
    })
    manifests.push(manifest)
  }

  // 7. Write SealedSecret manifests to disk
  // Note: These manifests are applied later during install, after the sealed-secrets
  // controller is deployed and the SealedSecret CRD is available.
  await deps.writeSealedSecretManifests(manifests, envDir)

  d.info(`Bootstrapped ${manifests.length} sealed secret manifests`)
}
