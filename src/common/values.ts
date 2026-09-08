import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { cloneDeep, get, merge, pick, set } from 'lodash'
import { supportedK8sVersions } from 'src/supportedK8sVersions.json'
import { $ } from 'zx'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import { saveValues } from './repo'
import {
  extract,
  flattenObject,
  getSchemaSecretsPaths,
  getValuesSchema,
  gucci,
  objectToYaml,
  pkg,
  removeBlankAttributes,
} from './utils'
import { HelmArguments } from './yargs'
import { stripAllSecrets } from './sealed-secrets'

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

export const writeValuesToFile = async (targetPath: string, values: Record<string, any>) => {
  const filePath = path.dirname(targetPath)
  await mkdir(filePath, { recursive: true })
  await writeFile(targetPath, objectToYaml(values))
}

export const getDefaultValues = async (): Promise<Record<string, any>> => {
  const defaultValues = (await hfValues({ defaultValues: true })) as Record<string, any>
  // Strip all secrets before writing to disk
  const secretPaths = await getSchemaSecretsPaths(Object.keys(get(defaultValues, 'teamConfig', {})))
  return stripAllSecrets(defaultValues, secretPaths)
}

/**
 * Writes new values to the repo. Will keep the original values if `overwrite` is `false`.
 * Secret values are written as-is — they are protected by SealedSecrets on the cluster side,
 * and child secrets are derived via ESO ExternalSecret CRs.
 */
export const writeValues = async (inValues: Record<string, any>, overwrite = false): Promise<void> => {
  const d = terminal('common:values:writeValues')
  d.debug('Writing values: ', inValues)
  await saveValues(env.ENV_DIR, inValues, {})
  d.info('All values were written to ENV_DIR')
}

export const deriveSecrets = async (values: Record<string, any> = {}): Promise<Record<string, any>> => {
  // Some secrets needs to be derived from the generated secrets
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
    getSchemaSecretsPaths,
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

  // Template paths use schema patternProperties regex keys which don't match concrete team names.
  // Expand team paths so team secrets are included in the result.
  const teamNames = Object.keys(get(values, 'teamConfig', {})).filter((t) => t !== 'admin')
  if (teamNames.length > 0) {
    const expandedPaths = await deps.getSchemaSecretsPaths(teamNames)
    const teamSecrets = pick(allSecrets, expandedPaths)
    merge(res, teamSecrets)
  }

  d.debug('generateSecrets result: ', res)
  return res
}
