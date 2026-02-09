import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { cloneDeep, get, isEmpty, isEqual, merge, mergeWith, pick, set } from 'lodash'
import path from 'path'
import { supportedK8sVersions } from 'src/supportedK8sVersions.json'
import { stringify } from 'yaml'
import { $ } from 'zx'
import { decrypt, encrypt } from './crypt'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import { getK8sSecret } from './k8s'
import { saveValues } from './repo'
import { APP_SECRET_OVERRIDES } from './sealed-secrets'
import { extract, flattenObject, getValuesSchema, gucci, loadYaml, pkg, removeBlankAttributes } from './utils'
import { HelmArguments } from './yargs'

export const objectToYaml = (obj: Record<string, any>, indent = 4, lineWidth = 200): string => {
  return isEmpty(obj) ? '' : stringify(obj, { indent, lineWidth })
}

let otomiK8sVersion: string
/**
 * Find the cluster kubernetes version in the values
 * @returns String of the kubernetes version on the cluster
 */
export const getK8sVersion = (argv?: HelmArguments): string => {
  if (argv?.kubeVersion) return argv?.kubeVersion
  if (process.env.KUBE_VERSION_OVERRIDE) return process.env.KUBE_VERSION_OVERRIDE
  if (otomiK8sVersion) return otomiK8sVersion
  const k8sVersion = supportedK8sVersions[supportedK8sVersions.length - 1]
  otomiK8sVersion = k8sVersion
  return otomiK8sVersion
}

/**
 * Find what image tag is defined in configuration for otomi
 * Do not call this function in bootstrap()
 * @returns string
 */
export const getImageTagFromValues = async (envDir = env.ENV_DIR): Promise<string> => {
  const values = await hfValues(undefined, envDir)
  return values!.otomi!.version
}

export const getPackageVersion = (): string => {
  return pkg.version
}

export interface Repo {
  email: string
  username: string
  password: string
  remote: string
  branch: string
}

/**
 * Resolves a single sealed:namespace/secretName/key placeholder to its actual value
 * by reading the corresponding K8s Secret. Returns the original value if not a placeholder
 * or if resolution fails.
 */
const resolveSinglePlaceholder = async (value: string, deps = { getK8sSecret }): Promise<string> => {
  if (!value || !value.startsWith('sealed:')) return value
  const ref = value.replace('sealed:', '')
  const parts = ref.split('/')
  if (parts.length !== 3) return value
  const [namespace, secretName, key] = parts
  try {
    const secret = await deps.getK8sSecret(secretName, namespace)
    if (secret?.[key] !== undefined) return String(secret[key])
  } catch {
    // K8s not available, return placeholder as-is
  }
  return value
}

export const getRepo = async (values: Record<string, any>, deps = { getK8sSecret }): Promise<Repo> => {
  const giteaEnabled = values?.apps?.gitea?.enabled ?? true
  const byor = !!values?.apps?.['otomi-api']?.git
  if (!giteaEnabled && !byor) {
    throw new Error('Gitea is disabled but no apps.otomi-api.git config was given.')
  }
  let username = 'Otomi Admin'
  let email: string
  let password: string
  let branch = 'main'
  let remote
  if (!giteaEnabled) {
    const otomiApiGit = values?.apps?.['otomi-api']?.git
    username = otomiApiGit?.user
    password = otomiApiGit?.password
    remote = otomiApiGit?.repoUrl
    email = otomiApiGit?.email
    branch = otomiApiGit?.branch ?? branch
  } else {
    username = 'otomi-admin'
    password = await resolveSinglePlaceholder(String(values?.apps?.gitea?.adminPassword ?? ''), deps)
    email = `pipeline@cluster.local`
    const gitUrl = env.GIT_URL
    const gitPort = env.GIT_PORT
    const gitOrg = 'otomi'
    const gitRepo = 'values'
    const protocol = env.GIT_PROTOCOL
    remote = `${protocol}://${username}:${encodeURIComponent(password)}@${gitUrl}:${gitPort}/${gitOrg}/${gitRepo}.git`
  }
  return { remote, branch, email, username, password }
}

function mergeCustomizer(prev, next) {
  return next
}

let hasSops = false
/**
 * Writes new values to a file. Will keep the original values if `overwrite` is `false`.
 */
export const writeValuesToFile = async (
  targetPath: string,
  inValues: Record<string, any> = {},
  overwrite = false,
): Promise<void> => {
  const d = terminal('common:values:writeValuesToFile')
  const filePath = path.dirname(targetPath)

  await mkdir(filePath, { recursive: true })

  const isSecretsFile = targetPath.includes('/secrets.') && hasSops
  const suffix = isSecretsFile ? '.dec' : ''
  const values = cloneDeep(inValues)
  const originalValues = (await loadYaml(targetPath + suffix, { noError: true })) ?? {}
  d.debug('originalValues: ', JSON.stringify(originalValues, null, 2))
  const mergeResult = mergeWith(cloneDeep(originalValues), values, mergeCustomizer)
  const cleanedValues = removeBlankAttributes(values)
  const cleanedMergeResult = removeBlankAttributes(mergeResult)
  if (((overwrite && isEmpty(cleanedValues)) || (!overwrite && isEmpty(cleanedMergeResult))) && isSecretsFile) {
    // get rid of empty secrets files as those are problematic
    if (existsSync(targetPath)) await unlink(targetPath)
    if (existsSync(`${targetPath}.dec`)) await unlink(`${targetPath}.dec`)
    return
  }
  const useValues = overwrite ? values : mergeResult
  if (!existsSync(targetPath) || overwrite) {
    // create the non-suffixed file for encryption to not skip this later on
    const notExists = !existsSync(targetPath)
    if (notExists) {
      if (isSecretsFile) {
        await writeFile(targetPath, objectToYaml(useValues))
        await encrypt(targetPath)
        await decrypt(targetPath)
        return
      }
      await writeFile(targetPath, objectToYaml(useValues))
      return
    }
  }

  if (isEqual(originalValues, useValues)) {
    d.debug(`No changes for ${targetPath}${suffix}, skipping...`)
    return
  }
  d.debug('mergeResult: ', JSON.stringify(useValues, null, 2))
  await writeFile(targetPath + suffix, objectToYaml(useValues))
  d.debug(`Values were written to ${targetPath}${suffix}`)
}

/**
 * Writes new values to the repo. Will keep the original values if `overwrite` is `false`.
 */
export const writeValues = async (inValues: Record<string, any>, overwrite = false): Promise<void> => {
  const d = terminal('common:values:writeValues')
  d.debug('Writing values: ', inValues)
  const valuesToWrite = replaceSecretsWithPlaceholders(inValues)
  await saveValues(env.ENV_DIR, valuesToWrite, {})
  d.info('All values were written to ENV_DIR')
}

/**
 * Builds a mapping from valuePath → sealed:<namespace>/<secretName>/<key>
 * using APP_SECRET_OVERRIDES configuration.
 */
function buildSecretPlaceholderMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [, overrides] of Object.entries(APP_SECRET_OVERRIDES)) {
    for (const override of overrides) {
      for (const [key, source] of Object.entries(override.data)) {
        if (!('static' in source) && source.valuePath) {
          map.set(source.valuePath, `sealed:${override.namespace}/${override.secretName}/${key}`)
        }
      }
    }
  }
  return map
}

export const replaceSecretsWithPlaceholders = (values: Record<string, any>): Record<string, any> => {
  const result = cloneDeep(values)
  const placeholderMap = buildSecretPlaceholderMap()

  for (const [valuePath, placeholder] of placeholderMap) {
    const value = get(result, valuePath)
    if (value !== undefined && typeof value === 'string' && !value.startsWith('sealed:')) {
      set(result, valuePath, placeholder)
    }
  }

  return result
}

export const deriveSecrets = async (values: Record<string, any> = {}): Promise<Record<string, any>> => {
  // Some secrets needs to be drived from the generated secrets

  const secrets = {}
  const htpasswd = (
    await $`htpasswd -nbB ${values.apps.harbor.registry.credentials.username} ${values.apps.harbor.registry.credentials.password}`
  ).stdout.trim()

  set(secrets, 'apps.harbor.registry.credentials.htpasswd', htpasswd)

  return secrets
}
/**
 * Takes values as input and generates secrets that don't exist yet.
 * Returns all generated secrets.
 */
export const generateSecrets = async (
  values: Record<string, any> = {},
  deps = {
    terminal,
    getValuesSchema,
  },
): Promise<Record<string, any>> => {
  const d = deps.terminal('common:values:generateSecrets')
  const leaf = 'x-secret'
  const schema = await deps.getValuesSchema()

  d.info('Extracting secrets')
  const schemaSecrets = extract(schema, leaf)
  // Remove properties with blank `x-secret`
  const template = removeBlankAttributes(schemaSecrets)

  d.debug('Secrets template: ', template)
  d.info('Generating secrets from the secrets template')
  const generatedSecrets = (await gucci(template, {})) as Record<string, any>
  const mergedGeneratedSecrets = merge(generatedSecrets, cloneDeep(values))

  const derivedSecrets = await deriveSecrets(mergedGeneratedSecrets)
  const allSecrets = merge(cloneDeep(derivedSecrets), cloneDeep(mergedGeneratedSecrets))

  d.info('Generated all secrets')
  // Only return values that have x-secrets prop and are now fully templated:
  const templatePaths = Object.keys(flattenObject(schemaSecrets))
  const res = pick(allSecrets, templatePaths)
  d.debug('generateSecrets result: ', res)
  return res
}
