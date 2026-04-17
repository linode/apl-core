import { ApiException, PatchStrategy, setHeaderOptions } from '@kubernetes/client-node'
import { encryptSecretItem } from '@linode/kubeseal-encrypt'
import { X509Certificate } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { cloneDeep, get, unset } from 'lodash'
import { pki } from 'node-forge'
import { join } from 'path'
import { SEALED_SECRETS_NAMESPACE } from 'src/common/constants'
import { terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { b64enc, ensureNamespaceExists, getK8sSecret, k8s } from 'src/common/k8s'
import { flattenObject, getSchemaSecretsPaths } from 'src/common/utils'
import { objectToYaml } from 'src/common/values'
import { parse as parseYaml } from 'yaml'

const cmdName = 'sealed-secrets'
const SEALED_SECRETS_MANIFESTS_SUBDIR = 'env/manifests/namespaces'

/**
 * Strip ALL x-secret fields from values before writing to disk.
 * Secrets are stored exclusively in SealedSecrets and delivered to apps via ExternalSecrets.
 * The values repo contains zero secret values.
 */
export function stripAllSecrets(values: Record<string, any>, secretPaths: string[]): Record<string, any> {
  const stripped = cloneDeep(values)
  for (const secretPath of secretPaths) {
    unset(stripped, secretPath)
  }
  return stripped
}

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

export interface SealedSecretsKeyPair {
  certificate: string
  privateKey: string
}

export interface AppliedSecret {
  namespace: string
  secretName: string
}

/**
 * Generate an RSA 4096-bit key pair and self-signed X.509 certificate for Sealed Secrets.
 * Follows the pattern from createCustomCA() in bootstrap.ts.
 */
export const generateSealedSecretsKeyPair = (deps = { terminal, pki }): SealedSecretsKeyPair => {
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
 * Note: Uses k8s client directly instead of getK8sSecret() because PEM certificates
 * are corrupted by the YAML parse step in getK8sSecret().
 */
export const getExistingSealedSecretsCert = async (deps = { k8s, terminal }): Promise<string | undefined> => {
  const d = deps.terminal(`common:${cmdName}:getExistingSealedSecretsCert`)

  try {
    const secret = await deps.k8s.core().readNamespacedSecret({
      name: 'sealed-secrets-key',
      namespace: 'sealed-secrets',
    })
    if (!secret?.data?.['tls.crt']) {
      d.info('No existing sealed-secrets-key found')
      return undefined
    }

    d.info('Found existing sealed-secrets-key certificate')
    return Buffer.from(secret.data['tls.crt'], 'base64').toString('utf-8')
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      d.info('No existing sealed-secrets-key found')
      return undefined
    }
    // When the cluster is unreachable (e.g., CI environment without a real cluster),
    // treat it as no existing cert found and let bootstrap generate a new key pair.
    d.info(`Could not reach cluster to check for existing cert: ${error instanceof Error ? error.message : error}`)
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
  deps = { getK8sSecret, terminal },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:createSealedSecretsKeySecret`)

  try {
    await ensureNamespaceExists('sealed-secrets')

    // Check if secret already exists
    const existing = await deps.getK8sSecret('sealed-secrets-key', 'sealed-secrets')
    if (existing) {
      d.info('sealed-secrets-key already exists, skipping creation')
      return
    }

    d.info('Creating sealed-secrets TLS secret')

    await k8s.core().createNamespacedSecret({
      namespace: 'sealed-secrets',
      body: {
        metadata: {
          name: 'sealed-secrets-key',
          namespace: 'sealed-secrets',
          labels: {
            'sealedsecrets.bitnami.com/sealed-secrets-key': 'active',
          },
        },
        type: 'kubernetes.io/tls',
        data: {
          'tls.crt': b64enc(certificate),
          'tls.key': b64enc(privateKey),
        },
      },
    })

    d.info('Created sealed-secrets TLS secret with key label')
  } catch (error) {
    // When the cluster is unreachable (e.g., CI/bootstrap without a real cluster),
    // skip secret creation. The secret will be created during install when the cluster is available.
    d.info(
      `Could not create sealed-secrets-key in cluster (will be created during install): ${error instanceof Error ? error.message : error}`,
    )
  }
}

/**
 * Find the group prefix for a secret path.
 * Groups: teamConfig.X, apps.X, or a single top-level key (e.g., 'otomi', 'dns').
 */
const findGroupPrefix = (secretPath: string): string | undefined => {
  const teamMatch = secretPath.match(/^teamConfig\.([^.]+)/)
  if (teamMatch) return `teamConfig.${teamMatch[1]}`

  const appsMatch = secretPath.match(/^apps\.([^.]+)/)
  if (appsMatch) return `apps.${appsMatch[1]}`

  // Top-level paths: use the first segment as the group prefix
  const [firstSegment] = secretPath.split('.')
  // Skip paths like 'kms' and 'users' which are handled separately
  if (firstSegment && firstSegment !== 'kms' && firstSegment !== 'users') return firstSegment

  return undefined
}

/**
 * Derive a K8s secret name from a secret path.
 * Convention: all secrets follow {name}-secrets pattern.
 *   - teamConfig.X  -> team-X-settings-secrets
 *   - apps.X        -> X-secrets
 *   - topLevel      -> topLevel-secrets
 */
const deriveSecretName = (secretPath: string): string => {
  const teamMatch = secretPath.match(/^teamConfig\.([^.]+)/)
  if (teamMatch) return `team-${teamMatch[1]}-settings-secrets`

  const appsMatch = secretPath.match(/^apps\.([^.]+)/)
  if (appsMatch) return `${appsMatch[1]}-secrets`

  return `${secretPath.split('.')[0]}-secrets`
}

/**
 * Build a mapping from secrets to their target namespaces and K8s secret names.
 * Groups secret paths by namespace and secret name.
 */
export const buildSecretToNamespaceMap = async (
  secrets: Record<string, any>,
  teams: string[],
  _allValues?: Record<string, any>,
  deps = { getSchemaSecretsPaths },
): Promise<SecretMapping[]> => {
  const secretPaths = await deps.getSchemaSecretsPaths(teams)
  const flat = flattenObject(secrets)

  // Group by namespace + secretName
  const groupMap = new Map<string, SecretMapping>()

  for (const secretPath of secretPaths) {
    // Skip users path — user secrets are managed individually in apl-users namespace
    if (secretPath === 'users') continue

    if (!findGroupPrefix(secretPath)) continue

    const secretName = deriveSecretName(secretPath)
    const groupKey = `${SEALED_SECRETS_NAMESPACE}/${secretName}`

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { namespace: SEALED_SECRETS_NAMESPACE, secretName, data: {} })
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
        // Skip empty relative paths (happens when flatKey === groupPrefix)
        if (!relativePath) continue
        const dataKey = relativePath.replace(/\./g, '_')
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
        type: 'kubernetes.io/opaque',
      },
    },
  }
}

/**
 * Write SealedSecret manifests to the env/manifests/namespaces directory.
 */
export const writeSealedSecretManifests = async (
  manifests: SealedSecretManifest[],
  envDir: string,
  deps = { mkdir, writeFile, objectToYaml, terminal },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:writeSealedSecretManifests`)

  for (const manifest of manifests) {
    const dir = `${envDir}/${SEALED_SECRETS_MANIFESTS_SUBDIR}/${manifest.metadata.namespace}/sealedsecrets`
    await deps.mkdir(dir, { recursive: true })
    const filePath = `${dir}/${manifest.metadata.name}.yaml`
    d.info(`Writing sealed secret to ${filePath}`)
    await deps.writeFile(filePath, deps.objectToYaml(manifest))
  }
}

/**
 * Apply a single SealedSecret manifest using server-side apply (create-or-update).
 * Uses the same pattern as applyArgocdApp() in apply-as-apps.ts.
 */
const applySealedSecretResource = async (manifest: SealedSecretManifest): Promise<void> => {
  await k8s.custom().patchNamespacedCustomObject(
    {
      group: 'bitnami.com',
      version: 'v1alpha1',
      namespace: manifest.metadata.namespace,
      plural: 'sealedsecrets',
      name: manifest.metadata.name,
      body: manifest,
      fieldManager: 'apl-operator',
      force: true,
    },
    setHeaderOptions('Content-Type', PatchStrategy.ServerSideApply),
  )
}

/**
 * Apply SealedSecret manifests to the Kubernetes cluster.
 * Creates namespaces if needed and applies the SealedSecret resources.
 */
export const applySealedSecretManifests = async (
  manifests: SealedSecretManifest[],
  deps = { terminal },
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
    await ensureNamespaceExists(namespace)

    for (const manifest of nsManifests) {
      d.info(`Applying SealedSecret ${manifest.metadata.name} to namespace ${namespace}`)
      await applySealedSecretResource(manifest)
    }
  }

  d.info(`Applied ${manifests.length} SealedSecret manifests to cluster`)
}

/**
 * Read and apply all SealedSecret manifests from the env/manifests/namespaces directory.
 * This should be called during install, after the sealed-secrets controller is deployed.
 * Returns the list of applied secrets (namespace + secretName) so callers can wait for them.
 */
export const applySealedSecretManifestsFromDir = async (
  envDir: string,
  deps = { terminal, readdir, readFile, existsSync },
): Promise<AppliedSecret[]> => {
  const d = deps.terminal(`common:${cmdName}:applySealedSecretManifestsFromDir`)
  const manifestsDir = join(envDir, SEALED_SECRETS_MANIFESTS_SUBDIR)

  if (!deps.existsSync(manifestsDir)) {
    d.info(`No SealedSecret manifests directory found at ${manifestsDir}`)
    return []
  }

  d.info(`Applying SealedSecret manifests from ${manifestsDir}`)

  // Read all namespace directories
  const namespaces = await deps.readdir(manifestsDir, { withFileTypes: true })
  const appliedSecrets: AppliedSecret[] = []

  for (const nsEntry of namespaces) {
    if (!nsEntry.isDirectory()) continue
    const namespace = nsEntry.name
    const sealedSecretsDir = join(manifestsDir, namespace, 'sealedsecrets')

    if (!deps.existsSync(sealedSecretsDir)) continue

    await ensureNamespaceExists(namespace)

    // Read all YAML files in the sealedsecrets subdirectory
    const files = await deps.readdir(sealedSecretsDir)
    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
      const filePath = join(sealedSecretsDir, file)
      d.info(`Applying SealedSecret from ${filePath}`)

      try {
        const content = await deps.readFile(filePath, 'utf-8')
        const manifest = parseYaml(content) as SealedSecretManifest

        await applySealedSecretResource(manifest)
        appliedSecrets.push({ namespace, secretName: manifest.metadata.name })
      } catch (error) {
        d.error(`Failed to apply SealedSecret from ${filePath}: ${error}`)
      }
    }
  }

  d.info(`Applied ${appliedSecrets.length} SealedSecret manifests from directory`)
  return appliedSecrets
}

/**
 * Restart the sealed-secrets controller to ensure it uses the correct key.
 * This is needed because if the controller starts before the sealed-secrets-key secret exists,
 * it will generate its own key. Restarting forces it to pick up the existing key.
 */
export const restartSealedSecretsController = async (deps = { terminal }): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:restartSealedSecretsController`)
  d.info('Restarting sealed-secrets controller to ensure correct key is used')

  try {
    await k8s.app().patchNamespacedDeployment(
      {
        name: 'sealed-secrets',
        namespace: 'sealed-secrets',
        body: {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
                },
              },
            },
          },
        },
      },
      setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
    )
  } catch (error) {
    d.warn(`Failed to restart sealed-secrets controller: ${error}`)
    return
  }

  d.info('Waiting for sealed-secrets controller rollout')
  const start = Date.now()
  while (Date.now() - start < env.SEALED_SECRETS_TIMEOUT_MS) {
    try {
      const deployment = await k8s.app().readNamespacedDeployment({
        name: 'sealed-secrets',
        namespace: 'sealed-secrets',
      })
      const desired = deployment.spec?.replicas ?? 1
      const updated = deployment.status?.updatedReplicas ?? 0
      const available = deployment.status?.availableReplicas ?? 0
      if (updated >= desired && available >= desired) {
        d.info('Sealed-secrets controller restarted successfully')
        return
      }
    } catch {
      // Ignore transient read errors during rollout
    }
    await new Promise((resolve) => setTimeout(resolve, env.SEALED_SECRETS_INTERVAL_MS))
  }
  d.warn('Rollout status check timed out')
}

/**
 * Create individual SealedSecret manifests for each user in the apl-users namespace.
 * Each user gets their own SealedSecret with all fields encrypted.
 */
export const createUserSealedSecretManifests = async (
  users: any[],
  pem: string,
  deps = { encryptSecretItem, terminal },
): Promise<SealedSecretManifest[]> => {
  const d = deps.terminal(`common:${cmdName}:createUserSealedSecretManifests`)
  const namespace = 'apl-users'
  const manifests: SealedSecretManifest[] = []

  for (const user of users) {
    const userId = user.name || user.id
    if (!userId) {
      d.warn('Skipping user without id/name')
      continue
    }

    const data: Record<string, string> = {
      email: user.email || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      initialPassword: user.initialPassword || '',
      isPlatformAdmin: String(user.isPlatformAdmin ?? false),
      isTeamAdmin: String(user.isTeamAdmin ?? false),
      teams: JSON.stringify(user.teams || []),
    }

    const encryptedData: Record<string, string> = {}
    for (const [key, value] of Object.entries(data)) {
      encryptedData[key] = await deps.encryptSecretItem(pem, namespace, value)
    }

    manifests.push({
      apiVersion: 'bitnami.com/v1alpha1',
      kind: 'SealedSecret',
      metadata: {
        annotations: { 'sealedsecrets.bitnami.com/namespace-wide': 'true' },
        name: userId,
        namespace,
      },
      spec: {
        encryptedData,
        template: {
          immutable: false,
          metadata: { name: userId, namespace },
          type: 'kubernetes.io/opaque',
        },
      },
    })
  }

  d.info(`Created ${manifests.length} individual user SealedSecret manifests`)
  return manifests
}

/**
 * Get the PEM public key from the existing sealed-secrets certificate in the cluster,
 * or generate a new RSA key pair, store it in the cluster, and return its PEM.
 */
export const getOrCreateSealedSecretsPem = async (
  deps = {
    terminal,
    getExistingSealedSecretsCert,
    getPemFromCertificate,
    generateSealedSecretsKeyPair,
    createSealedSecretsKeySecret,
  },
): Promise<string> => {
  const d = deps.terminal(`common:${cmdName}:getOrCreateSealedSecretsPem`)
  const existingCert = await deps.getExistingSealedSecretsCert()
  if (existingCert) {
    d.info('Using existing sealed-secrets certificate')
    return deps.getPemFromCertificate(existingCert)
  }
  d.info('Generating new sealed-secrets key pair')
  const { certificate, privateKey } = deps.generateSealedSecretsKeyPair()
  await deps.createSealedSecretsKeySecret(certificate, privateKey)
  return deps.getPemFromCertificate(certificate)
}

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
    createUserSealedSecretManifests,
    encryptSecretItem,
  },
): Promise<void> => {
  const d = deps.terminal(`common:${cmdName}:bootstrapSealedSecrets`)
  d.info('Bootstrapping sealed secrets')

  // 1. Get or create the sealed-secrets PEM public key
  const pem = await getOrCreateSealedSecretsPem({
    terminal: deps.terminal,
    getExistingSealedSecretsCert: deps.getExistingSealedSecretsCert,
    getPemFromCertificate: deps.getPemFromCertificate,
    generateSealedSecretsKeyPair: deps.generateSealedSecretsKeyPair,
    createSealedSecretsKeySecret: deps.createSealedSecretsKeySecret,
  })

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

  // 7. Create individual user SealedSecrets in apl-users namespace
  const { users } = secrets
  if (Array.isArray(users) && users.length > 0) {
    const userManifests = await deps.createUserSealedSecretManifests(users, pem, {
      encryptSecretItem: deps.encryptSecretItem,
      terminal: deps.terminal,
    })
    manifests.push(...userManifests)
  }

  // 8. Write SealedSecret manifests to disk
  // Note: These manifests are applied later during install, after the sealed-secrets
  // controller is deployed and the SealedSecret CRD is available.
  await deps.writeSealedSecretManifests(manifests, envDir)

  d.info(`Bootstrapped ${manifests.length} sealed secret manifests`)
}
