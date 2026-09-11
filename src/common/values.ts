import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { get } from 'lodash'
import { supportedK8sVersions } from 'src/supportedK8sVersions.json'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import { saveValues } from './repo'
import { getSchemaSecretsPaths, objectToYaml, pkg } from './utils'
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
