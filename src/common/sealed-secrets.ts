import { ApiException, PatchStrategy, setHeaderOptions } from '@kubernetes/client-node'
import { encryptSecretItem } from '@linode/kubeseal-encrypt'
import { X509Certificate } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { cloneDeep, get, unset } from 'lodash'
import { pki } from 'node-forge'
import { join } from 'path'
import { terminal } from 'src/common/debug'
import { b64enc, ensureNamespaceExists, getK8sSecret, k8s } from 'src/common/k8s'
import { flattenObject, getSchemaSecretsPaths } from 'src/common/utils'
import { objectToYaml } from 'src/common/values'
import { parse as parseYaml } from 'yaml'

const cmdName = 'sealed-secrets'

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
 * Resolve the namespace for a given secret path.
 * All core secrets go to 'apl-secrets' namespace for ESO access.
 * APP_NAMESPACE_MAP is kept for reference but not used for SealedSecret placement.
 */
const resolveNamespace = (secretPath: string): string | undefined => {
  // Check for teamConfig dynamic paths
  const teamMatch = secretPath.match(/^teamConfig\.([^.]+)/)
  if (teamMatch) {
    return 'apl-secrets'
  }

  // Check if this path matches any known prefix
  const sortedKeys = Object.keys(APP_NAMESPACE_MAP).sort((a, b) => b.length - a.length)
  for (const prefix of sortedKeys) {
    if (secretPath === prefix || secretPath.startsWith(`${prefix}.`)) {
      return 'apl-secrets'
    }
  }

  return undefined
}

// Map specific path prefixes to secret names
export const SECRET_NAME_MAP: Record<string, string> = {
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
    return `team-${teamMatch[1]}-settings-secrets`
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

  for (const secretPath of secretPaths) {
    // Skip SOPS-related paths
    if (secretPath.startsWith('kms.sops')) continue
    // Handle 'users' path specially — serialize pre-processed users array as single JSON value
    if (secretPath === 'users') {
      const usersData = secrets.users
      if (Array.isArray(usersData) && usersData.length > 0) {
        const namespace = 'apl-secrets'
        const secretName = 'users-secrets'
        const groupKey = `${namespace}/${secretName}`
        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, { namespace, secretName, data: {} })
        }
        const mapping = groupMap.get(groupKey)!
        mapping.data.usersJson = JSON.stringify(usersData)
      }
      continue
    }

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
      try {
        await k8s.custom().createNamespacedCustomObject({
          group: 'bitnami.com',
          version: 'v1alpha1',
          namespace,
          plural: 'sealedsecrets',
          body: manifest,
        })
      } catch (error) {
        if (error instanceof ApiException && error.code === 409) {
          await k8s.custom().patchNamespacedCustomObject(
            {
              group: 'bitnami.com',
              version: 'v1alpha1',
              namespace,
              plural: 'sealedsecrets',
              name: manifest.metadata.name,
              body: manifest,
            },
            setHeaderOptions('Content-Type', PatchStrategy.MergePatch),
          )
        } else {
          d.error(`Failed to apply SealedSecret ${manifest.metadata.name}: ${error}`)
        }
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
  deps = { terminal, readdir, readFile, existsSync },
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

    await ensureNamespaceExists(namespace)

    // Read all YAML files in the namespace directory
    const files = await deps.readdir(nsDir)
    for (const file of files) {
      if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue
      const filePath = join(nsDir, file)
      d.info(`Applying SealedSecret from ${filePath}`)

      try {
        const content = await deps.readFile(filePath, 'utf-8')
        const manifest = parseYaml(content) as SealedSecretManifest

        try {
          await k8s.custom().createNamespacedCustomObject({
            group: 'bitnami.com',
            version: 'v1alpha1',
            namespace,
            plural: 'sealedsecrets',
            body: manifest,
          })
          appliedCount += 1
        } catch (error) {
          if (error instanceof ApiException && error.code === 409) {
            await k8s.custom().patchNamespacedCustomObject(
              {
                group: 'bitnami.com',
                version: 'v1alpha1',
                namespace,
                plural: 'sealedsecrets',
                name: manifest.metadata.name,
                body: manifest,
              },
              setHeaderOptions('Content-Type', PatchStrategy.MergePatch),
            )
            appliedCount += 1
          } else {
            d.error(`Failed to apply SealedSecret from ${filePath}: ${error}`)
          }
        }
      } catch (parseError) {
        d.error(`Failed to parse SealedSecret from ${filePath}: ${parseError}`)
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
  const timeoutMs = 120000
  const intervalMs = 3000
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
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
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  d.warn('Rollout status check timed out')
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
