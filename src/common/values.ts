import { JSONSchema } from '@apidevtools/json-schema-ref-parser'
import { pathExists } from 'fs-extra'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { cloneDeep, get, isEmpty, isEqual, merge, omit, pick, set } from 'lodash'
import path, { dirname } from 'path'
import { supportedK8sVersions } from 'src/supportedK8sVersions.json'
import { stringify } from 'yaml'
import { $ } from 'zx'
import { decrypt, encrypt } from './crypt'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import {
  extract,
  FileType,
  flattenObject,
  getDirNames,
  getFiles,
  getValuesSchema,
  gucci,
  loadYaml,
  pkg,
  removeBlankAttributes,
} from './utils'

import { HelmArguments } from './yargs'

export const objectToYaml = (obj: Record<string, any>, indent = 4, lineWidth = 20): string => {
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

export const getTeamNames = async (): Promise<Array<string>> => {
  const teamsDir = path.join(env.ENV_DIR, 'env', 'teams')
  const teamNames = await getDirNames(teamsDir, { skipHidden: true })
  return teamNames
}

/**
 * Find what image tag is defined in configuration for otomi
 * @returns string
 */
export const getImageTag = async (envDir = env.ENV_DIR): Promise<string> => {
  if (process.env.OTOMI_TAG) return process.env.OTOMI_TAG
  if (await pathExists(`${envDir}/env/cluster.yaml`)) {
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
    password = values?.apps?.gitea?.adminPassword ?? values?.otomi?.adminPassword
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
  // creating secret files
  const schema: any = await getValuesSchema()
  const leaf = 'x-secret'
  const schemaSecrets: JSONSchema = extract(schema as JSONSchema, leaf, (val: any) =>
    val.length > 0 ? `{{ ${val} }}` : val,
  )
  d.debug('schemaSecrets: ', JSON.stringify(schemaSecrets, null, 2))
  // Get all JSON paths for secrets, without the .x-secret appended
  const secretPaths = Object.keys(flattenObject(schemaSecrets)).map((v) => v.replaceAll(`.${leaf}`, ''))
  // now blow up the teamConfig.$team prop as it is determined by a pattern
  const cleanSecretPaths: string[] = []
  const teamProp = `teamConfig.patternProperties.${
    Object.keys(schema.properties.teamConfig.patternProperties as JSONSchema)[0]
  }`
  secretPaths.forEach((p) => {
    teams.forEach((team: string) => {
      if (p.indexOf(teamProp) === 0) cleanSecretPaths.push(p.replace(teamProp, `teamConfig.${team}`))
    })
    if (p.indexOf(teamProp) === -1 && !cleanSecretPaths.includes(p)) cleanSecretPaths.push(p)
  })
  d.debug('cleanSecretPaths: ', cleanSecretPaths)
  // separate out the secrets
  const secrets = removeBlankAttributes(pick(values, cleanSecretPaths))
  d.debug('secrets: ', JSON.stringify(secrets, null, 2))
  // from the plain values
  const plainValues = omit(values, cleanSecretPaths) as any
  const fieldsToOmit = [
    'cluster',
    'policies',
    'teamConfig',
    'apps',
    '_derived',
    'license',
    'databases',
    'files',
    'bootstrap',
    'users',
  ]
  const secretSettings = omit(secrets, fieldsToOmit)
  const license = { license: values?.license }
  const settings = omit(plainValues, fieldsToOmit)
  const users = { users: values?.users }
  // and write to their files
  const promises: Promise<void>[] = []
  if (settings) promises.push(writeValuesToFile(`${env.ENV_DIR}/env/settings.yaml`, settings, overwrite))
  if (license) promises.push(writeValuesToFile(`${env.ENV_DIR}/env/secrets.license.yaml`, license, overwrite))
  if (users) promises.push(writeValuesToFile(`${env.ENV_DIR}/env/secrets.users.yaml`, users, overwrite))
  if (secretSettings || overwrite)
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/secrets.settings.yaml`, secretSettings, overwrite))
  if (plainValues.cluster || overwrite)
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/cluster.yaml`, { cluster: plainValues.cluster }, overwrite))
  if (plainValues.bootstrap || overwrite)
    promises.push(
      writeValuesToFile(`${env.ENV_DIR}/env/bootstrap.yaml`, { bootstrap: plainValues.bootstrap }, overwrite),
    )
  if (plainValues.policies || overwrite)
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/policies.yaml`, { policies: plainValues.policies }, overwrite))
  if (plainValues.teamConfig || overwrite) {
    const teamPromises: Promise<string>[] = []
    teams.forEach((teamName: string) => {
      // Should we try catch here?
      const teamSpec = get(plainValues, `teamConfig.${teamName}`, {})
      const teamSectesSpec = get(secrets, `teamConfig.${teamName}`, {})
      teamPromises.push(saveTeam(teamName, teamSpec, teamSectesSpec, overwrite))
    })
    await Promise.all(teamPromises)
  }
  await Promise.all(promises)

  const databasesValuesPromises = Object.keys((plainValues.databases || {}) as Record<string, any>).map((database) => {
    const valueObject = {
      databases: {
        [database]: plainValues.databases[database],
      },
    }
    return writeValuesToFile(`${env.ENV_DIR}/env/databases/${database}.yaml`, valueObject, overwrite)
  })
  await Promise.all(databasesValuesPromises)

  const plainValuesPromises = Object.keys((plainValues.apps || {}) as Record<string, any>).map((app) => {
    const valueObject = {
      apps: {
        [app]: plainValues.apps[app],
      },
    }
    return writeValuesToFile(`${env.ENV_DIR}/env/apps/${app}.yaml`, valueObject, overwrite)
  })
  await Promise.all(plainValuesPromises)

  const secretValuesPromises = Object.keys((secrets.apps || {}) as Record<string, any>).map((app) => {
    const valueObject = {
      apps: {
        [app]: secrets.apps[app],
      },
    }
    return writeValuesToFile(`${env.ENV_DIR}/env/apps/secrets.${app}.yaml`, valueObject, overwrite)
  })
  await Promise.all(secretValuesPromises)

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

export const saveTeam = async (
  teamName: string,
  teamSpec: Record<string, any>,
  teamSecrets: Record<string, any>,
  overwrite: boolean,
  deps = {
    writeValuesToFile,
  },
): Promise<string> => {
  const teamDir = path.join(env.ENV_DIR, 'env', 'teams', teamName)
  const teamPromises: Promise<void>[] = []
  const teamResourceNames = Object.keys(teamSpec).sort()
  teamResourceNames.forEach((resourceName) => {
    const resourceSpec = teamSpec[resourceName]
    if (Array.isArray(resourceSpec)) {
      // arrays items are stored as separate file in a dedicated directory
      const resourceDirPath = path.join(teamDir, resourceName)
      resourceSpec.forEach((resource) => {
        const resourceFileName = `${resource.name}.yaml`
        const resourcePath = path.join(resourceDirPath, resourceFileName)
        teamPromises.push(deps.writeValuesToFile(resourcePath, { spec: resource }, overwrite))
      })
    } else {
      // maps are stored in a file under team root directory
      const resourceFileName = `${resourceName}.yaml`
      const resourcePath = path.join(teamDir, resourceFileName)
      teamPromises.push(deps.writeValuesToFile(resourcePath, { spec: resourceSpec }, overwrite))
    }
  })

  // Team secrets needs special treatment
  const settingsSecretsPath = path.join(teamDir, 'secrets.settings.yaml')
  teamPromises.push(deps.writeValuesToFile(settingsSecretsPath, { spec: teamSecrets }, overwrite))
  await Promise.all(teamPromises)

  return teamDir
}

export const loadTeam = async (
  teamName: string,
  deps = {
    getFiles,
    loadTeamFile,
  },
): Promise<void> => {
  const teamSpec = {}
  const teamDir = path.join(env.ENV_DIR, 'env', 'teams', teamName)

  const teamDirs = await deps.getFiles(teamDir, { skipHidden: true, fileType: FileType.Directory })
  const teamFiles = await deps.getFiles(teamDir, { skipHidden: true, fileType: FileType.File })
  const teamPromises: Promise<void>[] = []

  const allPaths: Array<string> = []
  teamDirs.map(async (resourceName) => {
    teamSpec[resourceName] = []
    const resourceDir = path.join(teamDir, resourceName)
    const resourcePaths = await deps.getFiles(resourceDir, { skipHidden: true, fileType: FileType.Directory })
    resourcePaths.forEach((fileName) => allPaths.push(path.join(resourceDir, fileName)))
  })

  teamFiles.forEach((fileName) => {
    const resourceName = path.basename(fileName, path.extname(fileName))
    teamSpec[resourceName] = {}
    allPaths.push(path.join(teamDir, fileName))
  })

  allPaths.forEach((filePath) => teamPromises.push(deps.loadTeamFile(teamName, teamSpec, filePath)))

  await Promise.all(teamPromises)
}

const loadTeamFile = async (teamName: string, teamSpec, filePath: string, deps = { loadYaml }) => {
  const resourceType = dirname(filePath)
  const spec = teamSpec
  const content = await deps.loadYaml(filePath)

  // TODO handle secrets
  if (dirname(resourceType) === teamName) {
    // a regular file that is at team directory level
    const resourceName = path.basename(filePath, path.extname(filePath))
    spec[resourceName] = content?.spec
  } else {
    // a regular file that is at team resource collection level
    spec[resourceType].push(content?.spec)
  }
}
