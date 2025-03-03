import { pathExists } from 'fs-extra'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { cloneDeep, get, isEmpty, isEqual, merge, omit, pick, set } from 'lodash'
import path from 'path'
import { supportedK8sVersions } from 'src/supportedK8sVersions.json'
import { stringify } from 'yaml'
import { $ } from 'zx'
import { decrypt, encrypt } from './crypt'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import {
  extract,
  flattenObject,
  getSchemaSecretsPaths,
  getValuesSchema,
  gucci,
  loadYaml,
  pkg,
  removeBlankAttributes,
} from './utils'

import { saveValues } from './repo'
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
 * @returns string
 */
export const getImageTag = async (envDir = env.ENV_DIR): Promise<string> => {
  if (process.env.OTOMI_TAG) return process.env.OTOMI_TAG
  if (await pathExists(`${envDir}/env/settings/cluster.yaml`)) {
    const values = await hfValues(undefined, envDir)
    return values!.otomi!.version
  }
  return `v${pkg.version}`
}

/**
 * Find the current version of otomi that is running.
 * @returns string
 */
export const getCurrentVersion = async (): Promise<string> => {
  const tag = await getImageTag()
  const potentialVersion = tag.replace(/^v/, '')
  return /^[0-9.]+/.exec(potentialVersion) ? potentialVersion : pkg.version
}

export interface Repo {
  email: string
  username: string
  password: string
  remote: string
  branch: string
}

export const getRepo = (values: Record<string, any>): Repo => {
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
    password = values?.apps?.gitea?.adminPassword
    email = `pipeline@cluster.local`
    const giteaUrl = `gitea-http.gitea.svc.cluster.local:3000`
    const giteaOrg = 'otomi'
    const giteaRepo = 'values'
    remote = `http://${username}:${encodeURIComponent(password)}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git`
  }
  return { remote, branch, email, username, password }
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
  const mergeResult = merge(cloneDeep(originalValues), values)
  const cleanedValues = removeBlankAttributes(values)
  const cleanedMergeResult = removeBlankAttributes(mergeResult)
  if (((overwrite && isEmpty(cleanedValues)) || (!overwrite && isEmpty(cleanedMergeResult))) && isSecretsFile) {
    // get rid of empty secrets files as those are problematic
    if (await pathExists(targetPath)) await unlink(targetPath)
    if (await pathExists(`${targetPath}.dec`)) await unlink(`${targetPath}.dec`)
    return
  }
  const useValues = overwrite ? values : mergeResult
  if (!(await pathExists(targetPath)) || overwrite) {
    // create the non-suffixed file for encryption to not skip this later on
    const notExists = !(await pathExists(targetPath))
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
    d.info(`No changes for ${targetPath}${suffix}, skipping...`)
    return
  }
  d.debug('mergeResult: ', JSON.stringify(useValues, null, 2))
  await writeFile(targetPath + suffix, objectToYaml(useValues))
  d.info(`Values were written to ${targetPath}${suffix}`)
}

/**
 * Writes new values to the repo. Will keep the original values if `overwrite` is `false`.
 */
export const writeValues = async (inValues: Record<string, any>, overwrite = false): Promise<void> => {
  const d = terminal('common:values:writeValues')
  d.debug('Writing values: ', inValues)
  hasSops = await pathExists(`${env.ENV_DIR}/.sops.yaml`)
  const values = inValues
  const teams = Object.keys(get(inValues, 'teamConfig', {}))
  const cleanSecretPaths = await getSchemaSecretsPaths(Object.keys(teams))
  // treat every user as secret
  cleanSecretPaths.push('users')
  d.debug('cleanSecretPaths: ', cleanSecretPaths)
  // separate out the secrets
  const secrets = removeBlankAttributes(pick(values, cleanSecretPaths))
  d.debug('secrets: ', JSON.stringify(secrets, null, 2))
  // from the plain values
  const plainValues = omit(values, cleanSecretPaths) as any
  await saveValues(env.ENV_DIR, plainValues, secrets)

  d.info('All values were written to ENV_DIR')
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
