import { ApiException, PatchStrategy, setHeaderOptions } from '@kubernetes/client-node'
import { randomBytes } from 'crypto'
import { diff } from 'deep-diff'
import { existsSync, renameSync, rmSync, writeFileSync } from 'fs'
import { cp, rename as fsRename, rm } from 'fs/promises'
import { globSync } from 'glob'
import { cloneDeep, each, get, pull, set, unset } from 'lodash'
import { prepareEnvironment } from 'src/common/cli'
import { decrypt, encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { hfValues } from 'src/common/hf'
import { getFilename, getSchemaSecretsPaths, gucci, loadYaml, rootDir } from 'src/common/utils'
import { writeValues } from 'src/common/values'
import { BasicArguments, getParsedArgs, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { cd, sleep } from 'zx'
import { OTOMI_SECRETS, SEALED_SECRETS_NAMESPACE } from '../common/constants'
import {
  createArgoCdRedisSecret,
  getArgoCdApp,
  getK8sSecret,
  k8s,
  restartDeployment,
  restartStatefulSet,
  setArgoCdAppSync,
} from '../common/k8s'
import {
  applySealedSecretManifestsFromDir,
  buildSecretToNamespaceMap,
  createSealedSecretManifest,
  createSealedSecretsKeySecret,
  createUserSealedSecretManifests,
  generateSealedSecretsKeyPair,
  getExistingSealedSecretsCert,
  getOrCreateSealedSecretsPem,
  getPemFromCertificate,
  restartSealedSecretsController,
  SealedSecretManifest,
  writeSealedSecretManifests,
} from '../common/sealed-secrets'

const cmdName = getFilename(__filename)
const sealedSecretManifestsGlob = `${env.ENV_DIR}/env/manifests/namespaces/**/sealedsecrets/*.yaml`

interface Arguments extends BasicArguments {
  dryRun?: boolean
}

interface CustomMigrationFunction {
  (values: Record<string, any>): Promise<void>
}

interface Change {
  version: number
  clones?: Array<{
    [targetPath: string]: string
  }>
  fileDeletions?: Array<string>
  deletions?: Array<string>
  relocations?: Array<{
    [oldLocation: string]: string
  }>
  mutations?: Array<{
    [mutation: string]: string
  }>
  renamings?: Array<{
    [oldName: string]: string
  }>
  additions?: Array<{
    [mutation: string]: string
  }>
  fileAdditions?: Array<string>
  bulkAdditions?: Array<{
    [mutation: string]: string
  }>
  customFunctions?: string[]
}

export type Changes = Array<Change>

export const deleteFile = (
  relativeFilePath: string,
  dryRun = false,
  deps = { existsSync, renameSync, terminal, rmSync },
): void => {
  const d = deps.terminal(`cmd:${cmdName}:rename`)
  const path = `${env.ENV_DIR}/${relativeFilePath}`
  if (!deps.existsSync(path)) {
    d.warn(`File does not exist: "${path}". Already removed?`)
    return
  }
  if (!dryRun) {
    deps.rmSync(path)
  }
}

export const processDeletionEntry = (entry: string, values: Record<string, any>, deps = { deleteFile }): void => {
  unsetAtPath(entry, values)
  const appMatch = entry.match(/^apps\.([^.\s]+)$/)
  if (appMatch) {
    const appName = appMatch[1]
    deps.deleteFile(`env/apps/${appName}.yaml`)
    deps.deleteFile(`env/apps/secrets.${appName}.yaml`)
  }
}

export const rename = async (
  oldName: string,
  newName: string,
  dryRun = false,
  deps = { pathExists: existsSync, renameSync, terminal, move: fsRename, cp, rmSync },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:rename`)
  if (!deps.pathExists(`${env.ENV_DIR}/${oldName}`)) {
    d.warn(`File does not exist: "${env.ENV_DIR}/${oldName}". Already renamed?`)
    return
  }
  // so the file exists, check if it has a '/secrets.' companion
  let secretsCompanionOld
  let secretsCompanionNew
  if (oldName.includes('.yaml') && !oldName.includes('secrets.')) {
    const lastSlashPosOld = oldName.lastIndexOf('/') + 1
    const tmpOld = `${oldName.substring(0, lastSlashPosOld)}secrets.${oldName.substring(lastSlashPosOld)}`
    if (deps.pathExists(`${env.ENV_DIR}/${secretsCompanionOld}`)) {
      secretsCompanionOld = tmpOld
      const lastSlashPosNew = oldName.lastIndexOf('/') + 1
      secretsCompanionNew = `${newName.substring(0, lastSlashPosNew)}secrets.${newName.substring(lastSlashPosNew)}`
    }
  }
  d.info(`Renaming ${oldName} to ${newName}`)
  if (!dryRun) {
    try {
      await deps.move(`${env.ENV_DIR}/${oldName}`, `${env.ENV_DIR}/${newName}`)
      if (secretsCompanionOld) {
        // we also rename the secret companion
        await deps.move(`${env.ENV_DIR}/${secretsCompanionOld}`, `${env.ENV_DIR}/${secretsCompanionNew}`)
        if (deps.pathExists(`${env.ENV_DIR}/${secretsCompanionOld}.dec`))
          // and remove the old decrypted file
          deps.rmSync(`${env.ENV_DIR}/${secretsCompanionOld}.dec`)
      }
    } catch (e) {
      if (e.message === 'dest already exists.') {
        // we were given a folder that already exists, which is allowed,
        // so we defer to copying the contents and remove the source
        await deps.cp(`${env.ENV_DIR}/${oldName}`, `${env.ENV_DIR}/${newName}`, { preserveTimestamps: true })
        deps.rmSync(`${env.ENV_DIR}/${oldName}`, { recursive: true, force: true })
      }
    }
  }
}

const moveGivenJsonPath = (values: Record<string, any>, lhs: string, rhs: string): void => {
  const lhsPaths = unparsePaths(lhs, values)
  const rhsPaths = unparsePaths(rhs, values)

  lhsPaths.forEach((lhsPath, index) => {
    const pathParts = lhsPath.split('.')
    const item = pathParts.pop()
    const path = pathParts.join('.')
    const prev = get(values, path)
    const val = get(values, lhsPath)

    if (!val && Array.isArray(prev) && prev.includes(item)) {
      set(values, lhsPath, pull(prev, item))
      const next = get(values, rhsPaths[index])
      if (next && !next.includes(item)) {
        next.push(item)
        set(values, rhsPaths[index], next)
      } else {
        set(values, rhsPaths[index], [item])
      }
      return
    }

    if (val && set(values, rhsPaths[index], val)) {
      unset(values, lhsPath)
    }
  })
}

export function filterChanges(version: number, changes: Changes): Changes {
  return changes.filter((c) => c.version - version > 0)
}

const replace = async (tmplStr: any, prev: any): Promise<string> => {
  if (typeof tmplStr !== 'string' || !tmplStr.includes('.prev')) return tmplStr
  const tmpl = `{{ ${tmplStr} }}`
  return (await gucci(tmpl, { prev })) as string
}

/**
 * Allows to mutate or set values in dynamic paths that can include team marker or array notation.
 * Example:
 * - teamConfig.{team}.services[].someProp: replaceMe
 * This would update someProp for all team services
 */
export const setDeep = async (obj: Record<string, any>, path: string, tmplStr: string): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:setDeep`)
  d.debug(`(obj, ${path}, ${tmplStr}`)
  const teamMarker = '{team}'
  const arrayMarker = '[].'

  if (!path.includes(teamMarker) && !path.includes(arrayMarker)) {
    return
  }

  let paths: string[] = [path]
  // expand if we have a team marker
  if (path.includes(teamMarker)) {
    paths = Object.keys((obj.teamConfig as Record<string, any>) || {}).map((t) => path.replace(teamMarker, t))
  }

  // expand on array markers
  await Promise.all(
    paths.map(async (p) => {
      if (!p.includes(arrayMarker)) {
        const prev = get(obj, p)
        const ret = await replace(tmplStr, prev)
        set(obj, p, ret)
        return
      }

      const [lhs, ...rhs] = p.split(arrayMarker)
      const holder = get(obj, lhs)
      if (!holder) return
      await Promise.all(
        holder.map(async (item, idx) => {
          if (rhs.length === 1) {
            const prev = get(item, rhs[0])
            const ret = await replace(tmplStr, prev)
            const realPath = `${lhs}[${idx}].${rhs[0]}`
            set(obj, realPath, ret)
            return
          }
          const rhsPath = rhs.join(arrayMarker)
          // recurse
          const realPath = `${lhs}[${idx}].${rhsPath}`
          await setDeep(obj, realPath, tmplStr)
        }),
      )
    }),
  )
}

const bulkAddition = (path: string, values: any, filePath: string) => {
  const val = require(filePath)
  setAtPath(path, values, val)
}

const checkExists = async (func: () => Promise<any>): Promise<boolean> => {
  try {
    await func()
    return true
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      return false
    } else {
      throw error
    }
  }
}

async function namespaceExists(name: string): Promise<boolean> {
  return await checkExists(async () => await k8s.core().readNamespace({ name }))
}

async function hasPvcWithStorageClass(
  namespace: string,
  labelSelector: string,
  storageClassName: string,
): Promise<boolean> {
  try {
    const pvcList = await k8s.core().listNamespacedPersistentVolumeClaim({ namespace, labelSelector })
    return (pvcList?.items || []).some((pvc) => pvc?.spec?.storageClassName === storageClassName)
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      return false
    }
    throw error
  }
}

async function waitForPodsDeletion(namespace: string, labelSelector: string, timeoutMs = 300000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const pods = await k8s.core().listNamespacedPod({ namespace, labelSelector })
    if ((pods.items || []).length === 0) return
    await sleep(5000)
  }
  throw new Error(
    `Timed out waiting for pods with selector "${labelSelector}" in namespace "${namespace}" to be deleted`,
  )
}

async function waitForStatefulSetDeletion(name: string, namespace: string, timeoutMs = 300000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const exists = await checkExists(async () => await k8s.app().readNamespacedStatefulSet({ name, namespace }))
    if (!exists) return
    await sleep(5000)
  }
  throw new Error(`Timed out waiting for StatefulSet "${name}" in namespace "${namespace}" to be deleted`)
}

async function deletePvcsByLabel(namespace: string, labelSelector: string): Promise<void> {
  const pvcList = await k8s.core().listNamespacedPersistentVolumeClaim({ namespace, labelSelector })
  for (const pvc of pvcList.items || []) {
    const name = pvc?.metadata?.name
    if (!name) continue
    try {
      await k8s.core().deleteNamespacedPersistentVolumeClaim({ name, namespace })
    } catch (error) {
      if (!(error instanceof ApiException && error.code === 404)) throw error
    }
  }
}

async function migrateStatefulSetPvc(opts: {
  appName: string
  statefulSetName: string
  namespace: string
  pvcLabelSelector: string
  d: ReturnType<typeof terminal>
}): Promise<void> {
  const parsedArgs = getParsedArgs()
  if (parsedArgs?.dryRun || parsedArgs?.local) {
    return
  }

  const statefulSetExists = await checkExists(
    async () => await k8s.app().readNamespacedStatefulSet({ name: opts.statefulSetName, namespace: opts.namespace }),
  )
  if (!statefulSetExists) {
    opts.d.info(`StatefulSet ${opts.statefulSetName} not found — already deleted. Skipping migration.`)
    return
  }

  // Disable sync before scaling so ArgoCD cannot reconcile replicas back up during the window
  const app = await getArgoCdApp(opts.appName, k8s.custom())
  if (app) {
    await setArgoCdAppSync(opts.appName, false, k8s.custom())
  } else {
    opts.d.info(`Argo CD application ${opts.appName} not found. Skipping sync disable.`)
  }

  await k8s.app().patchNamespacedStatefulSet(
    {
      name: opts.statefulSetName,
      namespace: opts.namespace,
      body: { spec: { replicas: 0 } },
    },
    setHeaderOptions('Content-Type', PatchStrategy.StrategicMergePatch),
  )

  await waitForPodsDeletion(opts.namespace, opts.pvcLabelSelector)
  await deletePvcsByLabel(opts.namespace, opts.pvcLabelSelector)

  try {
    await k8s.app().deleteNamespacedStatefulSet({ name: opts.statefulSetName, namespace: opts.namespace })
  } catch (error) {
    if (!(error instanceof ApiException && error.code === 404)) throw error
  }

  await waitForStatefulSetDeletion(opts.statefulSetName, opts.namespace)
}

// This migration changes PVCs when using Linode for gitea-valkey and oauth2-proxy-redis-server to use linode-block-storage instead of linode-block-storage-retain
const valkeyAndOauth2RedisPVCMigration = async (values: Record<string, any>): Promise<void> => {
  const d = terminal('valkeyAndOauth2RedisPVCMigration')
  if (env.DISABLE_SYNC) {
    d.info('Skipping Valkey and Oauth2 Redis PVC migration in dev/test environment')
    return
  }
  const giteaEnabled = values?.apps?.gitea?.enabled
  const isLinode = values?.cluster?.provider === 'linode'
  const legacyStorageClass = 'linode-block-storage-retain'
  if (isLinode) {
    d.info('Changing PVC storage class to linode-block-storage for Gitea and OAuth2 Proxy Redis Server')
    if (giteaEnabled) {
      const hasLegacyGiteaPvc = await hasPvcWithStorageClass(
        'gitea',
        'app.kubernetes.io/name=valkey',
        legacyStorageClass,
      )
      if (hasLegacyGiteaPvc) {
        await migrateStatefulSetPvc({
          appName: 'gitea-gitea-valkey',
          statefulSetName: 'gitea-valkey-primary',
          namespace: 'gitea',
          pvcLabelSelector: 'app.kubernetes.io/name=valkey',
          d,
        })
      } else {
        d.info(`Skipping gitea PVC migration: no PVC found with storageClass ${legacyStorageClass}`)
      }
    }
    const hasLegacyOauthPvc = await hasPvcWithStorageClass('istio-system', 'app=redis', legacyStorageClass)
    if (hasLegacyOauthPvc) {
      await migrateStatefulSetPvc({
        appName: 'istio-system-oauth2-proxy',
        statefulSetName: 'oauth2-proxy-redis-ha-server',
        namespace: 'istio-system',
        pvcLabelSelector: 'app=redis',
        d,
      })
    } else {
      d.info(`Skipping oauth2-proxy redis PVC migration: no PVC found with storageClass ${legacyStorageClass}`)
    }
  }
}

export const addRedisSecretForArgoCD = async (values: Record<string, any>): Promise<void> => {
  const d = terminal('addRedisSecretForArgoCD')
  const argocdNamespace = 'argocd'

  try {
    const parsedArgs = getParsedArgs()
    if (parsedArgs?.dryRun || parsedArgs?.local || env.DISABLE_SYNC) {
      d.info('Skipping ArgoCD redis secret creation in dry-run/local/dev mode')
      return
    }

    if (!(await namespaceExists(argocdNamespace))) {
      d.info(`Namespace ${argocdNamespace} not found, skipping argocd-redis migration`)
      return
    }

    // redisPassword is an x-secret field: never present in values on disk.
    // Generate one and write it into the shared values object so sopsMigration (v61) seals the same password.
    const redisPassword = randomBytes(24).toString('base64url')
    set(values, 'apps.argocd.redisPassword', redisPassword)
    await createArgoCdRedisSecret({ apps: { argocd: { redisPassword } } })

    // Components consume REDIS_PASSWORD as env var, so they must restart after secret rotation.
    const restartTargets = [
      { kind: 'deployment', name: 'argocd-redis' },
      { kind: 'deployment', name: 'argocd-server' },
      { kind: 'deployment', name: 'argocd-repo-server' },
      { kind: 'statefulset', name: 'argocd-application-controller' },
      { kind: 'deployment', name: 'argocd-application-controller' },
    ]
    for (const target of restartTargets) {
      try {
        if (target.kind === 'deployment') {
          await restartDeployment(target.name, argocdNamespace)
        } else {
          await restartStatefulSet(target.name, argocdNamespace)
        }
        d.info(`Restarted ${target.kind}/${target.name}`)
      } catch (error) {
        if (error instanceof ApiException && error.code === 404) {
          d.debug(`Could not restart ${target.kind}/${target.name}: not found`)
          continue
        }
        throw error
      }
    }
  } catch (error) {
    d.error('Failed to create/update ArgoCD redis secret, continuing migration:', error)
  }
}

const addLinodeNBAnnotations = async (values: Record<string, any>): Promise<void> => {
  const d = terminal('addLinodeNBAnnotations')
  if (values?.cluster?.provider !== 'linode') {
    d.info('Skipping Linode NodeBalancer annotation migration: provider is not linode')
    return
  }
  if (env.DISABLE_SYNC) {
    d.info('Skipping Linode NodeBalancer annotation migration in dev/test environment')
    return
  }

  const linodeSecret = await getK8sSecret('linode', 'kube-system')
  if (!linodeSecret?.token) {
    d.warn('Linode secret not found or token missing in kube-system, skipping Linode NodeBalancer annotation migration')
    return
  }
  const token = linodeSecret.token as string

  d.info('Fetching external IP from ingress-nginx-platform-controller service')
  let serviceIp: string | undefined
  try {
    const svc = await k8s
      .core()
      .readNamespacedService({ name: 'ingress-nginx-platform-controller', namespace: 'ingress' })
    serviceIp = svc?.status?.loadBalancer?.ingress?.[0]?.ip
  } catch (error) {
    d.warn(`Error reading ingress-nginx-platform-controller service: ${error}`)
    return
  }
  if (!serviceIp) {
    d.warn(
      'No external IP found on ingress-nginx-platform-controller service, skipping Linode NodeBalancer annotation migration',
    )
    return
  }
  d.info(`Found service external IP ${serviceIp}, querying Linode API for matching NodeBalancer`)
  let nbId: number | undefined
  try {
    const response = await fetch('https://api.linode.com/v4/nodebalancers', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      d.warn(`Failed to fetch NodeBalancers from Linode API: ${response.status} ${response.statusText}`)
      return
    }
    const data = (await response.json()) as { data: Array<{ id: number; ipv4: string }> }
    const nb = data.data?.find((n) => n.ipv4 === serviceIp)
    if (!nb) {
      d.warn(`No NodeBalancer found matching service IP ${serviceIp}, skipping`)
      return
    }
    nbId = nb.id
  } catch (error) {
    d.warn(`Error querying Linode API: ${error}`)
    return
  }

  d.info(`Found NodeBalancer ID ${nbId}, adding annotations to ingress.platformClass`)
  const annotations: Array<{ key: string; value: string }> = get(values, 'ingress.platformClass.annotations', [])
  const preserveKey = 'service.beta.kubernetes.io/linode-loadbalancer-preserve'
  const nbIdKey = 'service.beta.kubernetes.io/linode-loadbalancer-nodebalancer-id'
  if (!annotations.find((a) => a.key === preserveKey)) {
    annotations.push({ key: preserveKey, value: 'true' })
  }
  if (!annotations.find((a) => a.key === nbIdKey)) {
    annotations.push({ key: nbIdKey, value: String(nbId) })
  }
  set(values, 'ingress.platformClass.annotations', annotations)
  d.info('Linode NodeBalancer annotations added to ingress.platformClass successfully')
}

export const removeSopsArtifacts = (deps = { existsSync, rmSync, globSync, terminal }): void => {
  const d = deps.terminal(`cmd:${cmdName}:removeSopsArtifacts`)

  // Remove .sops.yaml — makes encrypt()/decrypt() no-ops
  const sopsConfigPath = `${env.ENV_DIR}/.sops.yaml`
  if (deps.existsSync(sopsConfigPath)) {
    deps.rmSync(sopsConfigPath)
    d.info('Removed .sops.yaml')
  }

  // Remove SOPS-encrypted files
  const sopsEncrypted = deps.globSync(`${env.ENV_DIR}/env/**/secrets.*.yaml`, { dot: false })
  for (const f of sopsEncrypted) {
    deps.rmSync(f)
    d.info(`Removed ${f}`)
  }

  // Remove SOPS-decrypted files
  const sopsDecrypted = deps.globSync(`${env.ENV_DIR}/env/**/secrets.*.yaml.dec`, { dot: false })
  for (const f of sopsDecrypted) {
    deps.rmSync(f)
    d.info(`Removed ${f}`)
  }

  // Remove user YAML files — users are now managed via SealedSecrets in env/manifests/namespaces/apl-users/sealedsecrets.
  // These files may contain SOPS-encrypted data that was written by the "Write default values" step
  // before SOPS decryption ran, contaminating the public YAML files with ENC[...] strings.
  const userFiles = deps.globSync(`${env.ENV_DIR}/env/users/*.yaml`, { dot: false })
  for (const f of userFiles) {
    deps.rmSync(f)
    d.info(`Removed ${f}`)
  }
}

export const sopsMigration = async (
  values: Record<string, any>,
  deps = {
    existsSync,
    globSync,
    terminal,
    getOrCreateSealedSecretsPem,
    getExistingSealedSecretsCert,
    getPemFromCertificate,
    generateSealedSecretsKeyPair,
    createSealedSecretsKeySecret,
    buildSecretToNamespaceMap,
    createSealedSecretManifest,
    createUserSealedSecretManifests,
    writeSealedSecretManifests,
    applySealedSecretManifestsFromDir,
    restartSealedSecretsController,
    getK8sSecret,
    getSchemaSecretsPaths,
    removeSopsArtifacts,
  },
): Promise<void> => {
  const d = deps.terminal(`cmd:${cmdName}:sopsMigration`)

  // Idempotency guard: no SOPS config means migration already ran.
  // However, if SealedSecret manifests exist on disk but the K8s Secrets are not yet
  // decrypted (e.g. the operator was killed after writing manifests but before applying
  // them, or the controller used its auto-generated key), re-apply them and restart
  // the controller so subsequent steps can resolve the git password.
  if (!deps.existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    const existingManifests = deps.globSync(sealedSecretManifestsGlob, {
      dot: false,
    })
    if (existingManifests.length > 0) {
      try {
        const platformSecret = await deps.getK8sSecret(OTOMI_SECRETS, SEALED_SECRETS_NAMESPACE)
        if (!platformSecret) {
          d.info('SealedSecret manifests exist but K8s Secrets are missing — re-applying and restarting controller')
          await deps.applySealedSecretManifestsFromDir(env.ENV_DIR)
          await deps.restartSealedSecretsController()
        }
      } catch {
        d.info('Could not reach K8s API to check secrets, skipping re-apply')
      }
    }
    d.info('No .sops.yaml found, skipping SOPS migration')
    return
  }

  d.info('Starting SOPS to SealedSecrets migration')

  // Get or generate sealed-secrets key
  const pem = await deps.getOrCreateSealedSecretsPem({
    terminal: deps.terminal,
    getExistingSealedSecretsCert: deps.getExistingSealedSecretsCert,
    getPemFromCertificate: deps.getPemFromCertificate,
    generateSealedSecretsKeyPair: deps.generateSealedSecretsKeyPair,
    createSealedSecretsKeySecret: deps.createSealedSecretsKeySecret,
  })

  // Build secret-to-namespace mappings
  const teams = Object.keys((values.teamConfig as Record<string, any>) || {})
  const mappings = await deps.buildSecretToNamespaceMap(values, teams, values)

  // Create core SealedSecret manifests
  const manifests: SealedSecretManifest[] = []
  for (const mapping of mappings) {
    const manifest = await deps.createSealedSecretManifest(pem, mapping)
    manifests.push(manifest)
  }

  // Create user SealedSecret manifests
  const users = values.users as any[] | undefined
  if (Array.isArray(users) && users.length > 0) {
    const userManifests = await deps.createUserSealedSecretManifests(users, pem)
    manifests.push(...userManifests)
  }

  // Write manifests to disk
  await deps.writeSealedSecretManifests(manifests, env.ENV_DIR)
  d.info(`Wrote ${manifests.length} SealedSecret manifests`)

  // Apply SealedSecret manifests to the cluster so the sealed-secrets controller
  // can decrypt them into K8s Secrets before the apply step needs them.
  d.info('Applying SealedSecret manifests to cluster')
  await deps.applySealedSecretManifestsFromDir(env.ENV_DIR)

  // Restart the sealed-secrets controller so it picks up the migration-generated key.
  // Without this, the controller uses its auto-generated key and cannot decrypt.
  d.info('Restarting sealed-secrets controller to use migration key')
  await deps.restartSealedSecretsController()

  // Strip secrets from values (in-place mutation — writeValues() persists after return)
  const secretPaths = await deps.getSchemaSecretsPaths(teams)
  for (const path of secretPaths) {
    unset(values, path)
  }

  // Remove SOPS artifacts
  deps.removeSopsArtifacts()
  d.info('SOPS to SealedSecrets migration complete')
}

const setIngressDefault = async (values: Record<string, any>) => {
  const d = terminal('setIngressDefault')
  if (values?.cluster?.provider !== 'linode') {
    // In non-Linode env, old and new setup co-exist in two separate LB services until this gets deactivated
    set(values, 'apps.ingress-nginx-platform.enabled', true)
    d.info('Skipping Linode NodeBalancer annotation migration: provider is not linode')
    return
  }
  // The following is overridden during the pre-upgrade script
  set(values, 'apps.ingress-nginx-platform.enabled', false)
}

const removeIngressTracing = async (values: Record<string, any>) => {
  const apps: Record<string, any> = values?.apps ?? {}
  Object.entries(apps).forEach(([key, value]) => {
    if (key.startsWith('ingress-nginx-')) {
      unset(value, 'tracing')
    }
  })
}

const removeIngressNginxValues = async (values: Record<string, any>) => {
  const d = terminal('removeIngressNginxValues')
  const apps: Record<string, any> = values?.apps ?? {}
  const ingressApps = Object.keys(apps).filter((key) => key.startsWith('ingress-nginx-'))
  for (let ingressAppName of ingressApps) {
    const valuesFile = `${env.ENV_DIR}/env/apps/${ingressAppName}.yaml`
    d.info(`Removing ${valuesFile}`)
    unset(apps, ingressAppName)
    await rm(valuesFile)
  }
}

const customMigrationFunctions: Record<string, CustomMigrationFunction> = {
  valkeyAndOauth2RedisPVCMigration,
  addLinodeNBAnnotations,
  sopsMigration,
  setIngressDefault,
  addRedisSecretForArgoCD,
  removeIngressTracing,
  removeIngressNginxValues,
}

/**
 * Applies changes from configuration.
 *
 * NOTE: renamings,deletions,relocations and mutations MUST be given in arrays only,
 * with max 1 item per array, to preserve order of operation
 */
export const applyChanges = async (
  changes: Changes,
  dryRun = false,
  deps = {
    cd,
    rename,
    hfValues,
    terminal,
    writeValues,
  },
): Promise<Record<string, any>> => {
  deps.cd(env.ENV_DIR)
  // do file renamings first as those have to match the current containers expectations
  for (const c of changes) {
    c.renamings?.forEach((entry) => each(entry, async (newName, oldName) => deps.rename(oldName, newName, dryRun)))
    // same for any new file additions
    c.fileAdditions?.forEach((path) => writeFileSync(`${env.ENV_DIR}/${path}`, ''))
  }
  // only then can we get the values and do mutations on them
  const prevValues = (await deps.hfValues({ filesOnly: true })) as Record<string, any>
  const values = cloneDeep(prevValues)
  for (const c of changes) {
    c.additions?.forEach((entry: any) => each(entry, (val, path) => setAtPath(path, values, val)))
    c.bulkAdditions?.forEach((entry) => each(entry, (filePath, path) => bulkAddition(path, values, filePath)))
    c.relocations?.forEach((entry) => each(entry, (newName, oldName) => moveGivenJsonPath(values, oldName, newName)))
    if (c.mutations)
      // 'for const of' is used here to allow await in loop
      for (const mut of c.mutations) {
        // eslint-disable-next-line prefer-destructuring
        const [path, tmplStr] = Object.entries(mut)[0]
        const prev = get(values, path)
        if (prev !== undefined) {
          // path worked and we found something, simple scenario, just replace directly
          const ret = await replace(tmplStr, prev)
          set(values, path, ret)
        } else {
          // we might have a complex path, which we will deal with in setDeep
          await setDeep(values, path, tmplStr)
        }
      }

    for (const customFunctionName of c.customFunctions || []) {
      const customFunction = customMigrationFunctions[customFunctionName]
      if (!customFunction) {
        throw new Error(`Error in migration: Custom migration function ${customFunctionName} not found`)
      }
      await customFunction(values)
    }

    c.deletions?.forEach((entry) => processDeletionEntry(entry, values))
    // Lastly we remove files
    for (const change of changes) {
      change.fileDeletions?.forEach((entry) => {
        const paths = unparsePaths(entry, values)
        paths.forEach((path) => deleteFile(path))
      })
    }

    Object.assign(values.versions, { specVersion: c.version })
  }
  if (!dryRun) await deps.writeValues(values, true)
  // @ts-ignore
  return diff(prevValues, values)
}

export const unparsePaths = (path: string, values: Record<string, any>): Array<string> => {
  if (path.includes('{team}')) {
    let paths: Array<string> = []
    const teams: Array<string> = Object.keys(values?.teamConfig as Record<string, any>)
    teams.forEach((teamName) => paths.push(path.replace('{team}', teamName)))
    paths = transformArrayToPaths(paths, values)
    return paths.sort()
  } else {
    const paths = transformArrayToPaths([path], values)
    return paths
  }
}

function transformArrayToPaths(paths: string[], values: Record<string, any>): string[] {
  const transformedPaths: string[] = []

  paths.forEach((path) => {
    const match = path.match(/^(.*)\.(\w+)\[\](.*)$/)
    if (!match) {
      transformedPaths.push(path)
      return
    }

    const [, beforeArrayPath, arrayKey, afterArrayPath] = match

    const objectPath = beforeArrayPath.split('.').reduce((obj, key) => obj?.[key], values)

    if (objectPath && objectPath[arrayKey]) {
      objectPath[arrayKey].forEach((_item: any, index: number) => {
        transformedPaths.push(`${beforeArrayPath}.${arrayKey}[${index}]${afterArrayPath}`)
      })
    }
  })

  return transformedPaths
}
export const unsetAtPath = (path: string, values: Record<string, any>): void => {
  const paths = unparsePaths(path, values)
  paths.forEach((p) => unset(values, p))
}

export const setAtPath = (path: string, values: Record<string, any>, value: string): void => {
  const paths = unparsePaths(path, values)
  paths.forEach((p) => set(values, p, Array.isArray(value) ? [...value] : value))
}

export const migrate = async (): Promise<boolean> => {
  const d = terminal(`cmd:${cmdName}:migrate`)
  const argv: Arguments = getParsedArgs()

  const changes: Changes = (await loadYaml(`${rootDir}/values-changes.yaml`))?.changes
  const versions = await loadYaml(`${env.ENV_DIR}/env/settings/versions.yaml`, { noError: true })
  const prevVersion: number = versions?.spec?.specVersion
  if (!prevVersion) {
    d.log('No previous version detected')
    return false
  }
  const filteredChanges = filterChanges(prevVersion, changes)
  if (filteredChanges.length) {
    d.log(
      `Changes detected, migrating from ${prevVersion} to ${
        filteredChanges[filteredChanges.length - 1].version
      } version`,
    )
    const diffedValues = await applyChanges(filteredChanges, argv.dryRun)
    // encrypt and decrypt to
    await encrypt()
    await decrypt()
    d.log(`Migration changes: ${JSON.stringify(diffedValues, null, 2)}`)
    return true
  }

  d.log('No changes detected, skipping')
  return false
}

export function extractTeamDirectoryFromWorkloadPath(filePath: string): string {
  const match = filePath.match(/\/workloads\/([^/]+)/)
  if (match === null) throw new Error(`Cannot extract team name from ${filePath} string`)
  return match[1]
}

export const module = {
  command: cmdName,
  hidden: true,
  describe: 'Migrate values',
  builder: (parser: Argv): Argv =>
    parser.options({
      'dry-run': {
        alias: ['d'],
        boolean: true,
        default: false,
        hidden: true,
      },
    }),

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await migrate()
  },
}
