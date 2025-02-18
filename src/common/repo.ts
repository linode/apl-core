import { rmSync } from 'fs'
import { pathExists } from 'fs-extra'
import { rm, writeFile } from 'fs/promises'
import { globSync } from 'glob'
import jsonpath from 'jsonpath'
import { cloneDeep, get, merge, set } from 'lodash'
import path from 'path'
import { getDirNames, loadYaml } from './utils'
import { objectToYaml, writeValuesToFile } from './values'

export async function getTeamNames(envDir: string): Promise<Array<string>> {
  const teamsDir = path.join(envDir, 'env', 'teams')
  return await getDirNames(teamsDir, { skipHidden: true })
}

export interface FileMap {
  envDir: string
  kind:
    | 'AplApp'
    | 'AplAlertSet'
    | 'AplCluster'
    | 'AplDatabase'
    | 'AplDns'
    | 'AplIngress'
    | 'AplObjectStorage'
    | 'AplKms'
    | 'AplIdentityProvider'
    | 'AplCapabilitySet'
    | 'AplSmtp'
    | 'AplBackupCollection'
    | 'AplUser'
    | 'AplTeamBuild'
    | 'AplTeamPolicy'
    | 'AplTeamSettingSet'
    | 'AplTeamNetworkControl'
    | 'AplTeamProject'
    | 'AplTeamBackup'
    | 'AplTeamSecret'
    | 'AplTeamService'
    | 'AplTeamWorkload'
    | 'AplTeamTool'
    | 'AplVersion'
  jsonPathExpression: string
  pathGlob: string
  processAs: 'arrayItem' | 'mapItem'
  resourceGroup: 'team' | 'platformSettings' | 'platformApps' | 'platformDatabases' | 'platformBackups' | 'users'
  resourceDir: string
}

export function getResourceFileName(fileMap: FileMap, jsonPath: jsonpath.PathComponent[], data: Record<string, any>) {
  let fileName = 'unknown'
  if (fileMap.resourceGroup === 'team') {
    if (fileMap.processAs === 'arrayItem') {
      fileName = data.name || data.id || fileName
    } else {
      fileName = jsonPath[jsonPath.length - 1].toString()
    }
  } else {
    if (fileMap.processAs === 'arrayItem') {
      fileName = data.name || data.id || fileName
    } else {
      fileName = jsonPath[jsonPath.length - 1].toString()
    }
  }
  return fileName
}

export function getResourceName(fileMap: FileMap, jsonPath: jsonpath.PathComponent[], data: Record<string, any>) {
  let resourceName = 'unknown'
  if (fileMap.processAs === 'arrayItem') {
    resourceName = data.name || data.id || resourceName
    return resourceName
  }

  if (fileMap.resourceGroup === 'team') {
    resourceName = getTeamNameFromJsonPath(jsonPath)
    return resourceName
  } else {
    resourceName = jsonPath[jsonPath.length - 1].toString()
    return resourceName
  }
}

export function getTeamNameFromJsonPath(jsonPath: jsonpath.PathComponent[]): string {
  const teamName = jsonPath[2].toString()
  return teamName
}

export function getFilePath(
  fileMap: FileMap,
  jsonPath: jsonpath.PathComponent[],
  data: Record<string, any>,
  fileNamePrefix: string,
) {
  let filePath = ''
  const resourceName = getResourceFileName(fileMap, jsonPath, data)
  if (fileMap.resourceGroup === 'team') {
    const teamName = getTeamNameFromJsonPath(jsonPath)
    filePath = `${fileMap.envDir}/env/teams/${teamName}/${fileMap.resourceDir}/${fileNamePrefix}${resourceName}.yaml`
  } else {
    filePath = `${fileMap.envDir}/env/${fileMap.resourceDir}/${fileNamePrefix}${resourceName}.yaml`
  }
  // normalize paths like /ab/c/./test/yaml
  return path.normalize(filePath)
}

export function getFileMaps(envDir: string): Array<FileMap> {
  return [
    {
      kind: 'AplApp',
      envDir,
      jsonPathExpression: '$.apps.*',
      pathGlob: `${envDir}/env/apps/*.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformApps',
      resourceDir: 'apps',
    },
    {
      envDir,
      kind: 'AplAlertSet',
      jsonPathExpression: '$.alerts',
      pathGlob: `${envDir}/env/settings/*alerts.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplCluster',
      envDir,
      jsonPathExpression: '$.cluster',
      pathGlob: `${envDir}/env/settings/cluster.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplDatabase',
      envDir,
      jsonPathExpression: '$.databases.*',
      pathGlob: `${envDir}/env/databases/*.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformDatabases',
      resourceDir: 'databases',
    },
    {
      kind: 'AplDns',
      envDir,
      jsonPathExpression: '$.dns',
      pathGlob: `${envDir}/env/settings/*dns.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplIngress',
      envDir,
      jsonPathExpression: '$.ingress',
      pathGlob: `${envDir}/env/settings/ingress.yaml`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplKms',
      envDir,
      jsonPathExpression: '$.kms',
      pathGlob: `${envDir}/env/settings/*kms.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplObjectStorage',
      envDir,
      jsonPathExpression: '$.obj',
      pathGlob: `${envDir}/env/settings/*obj.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplIdentityProvider',
      envDir,
      jsonPathExpression: '$.oidc',
      pathGlob: `${envDir}/env/settings/*oidc.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplCapabilitySet',
      envDir,
      jsonPathExpression: '$.otomi',
      pathGlob: `${envDir}/env/settings/*otomi.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplBackupCollection',
      envDir,
      jsonPathExpression: '$.platformBackups',
      pathGlob: `${envDir}/env/settings/*platformBackups.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformBackups',
      resourceDir: 'settings',
    },
    {
      kind: 'AplSmtp',
      envDir,
      jsonPathExpression: '$.smtp',
      pathGlob: `${envDir}/env/settings/*smtp.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplUser',
      envDir,
      jsonPathExpression: '$.users[*]',
      pathGlob: `${envDir}/env/users/*.{yaml,yaml.dec}`,
      processAs: 'arrayItem',
      resourceGroup: 'users',
      resourceDir: 'users',
    },
    {
      kind: 'AplVersion',
      envDir,
      jsonPathExpression: '$.versions',
      pathGlob: `${envDir}/env/settings/versions.yaml`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      resourceDir: 'settings',
    },
    {
      kind: 'AplTeamBuild',
      envDir,
      jsonPathExpression: '$.teamConfig.*.builds[*]',
      pathGlob: `${envDir}/env/teams/*/builds/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'builds',
    },
    {
      kind: 'AplTeamWorkload',
      envDir,
      jsonPathExpression: '$.teamConfig.*.workloads[*]',
      pathGlob: `${envDir}/env/teams/*/workloads/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'workloads',
    },
    {
      kind: 'AplTeamService',
      envDir,
      jsonPathExpression: '$.teamConfig.*.services[*]',
      pathGlob: `${envDir}/env/teams/*/services/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'services',
    },
    {
      kind: 'AplTeamSecret',
      envDir,
      jsonPathExpression: '$.teamConfig.*.sealedsecrets[*]',
      pathGlob: `${envDir}/env/teams/*/sealedsecrets/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'sealedsecrets',
    },
    {
      kind: 'AplTeamBackup',
      envDir,
      jsonPathExpression: '$.teamConfig.*.backups[*]',
      pathGlob: `${envDir}/env/teams/*/backups/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'backups',
    },
    {
      kind: 'AplTeamProject',
      envDir,
      jsonPathExpression: '$.teamConfig.*.projects[*]',
      pathGlob: `${envDir}/env/teams/*/projects/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'projects',
    },
    {
      kind: 'AplTeamNetworkControl',
      envDir,
      jsonPathExpression: '$.teamConfig.*.netpols[*]',
      pathGlob: `${envDir}/env/teams/*/netpols/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      resourceDir: 'netpols',
    },
    {
      kind: 'AplTeamSettingSet',
      envDir,
      jsonPathExpression: '$.teamConfig.*.settings',
      pathGlob: `${envDir}/env/teams/*/*settings{.yaml,.yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'team',
      resourceDir: '.',
    },
    {
      kind: 'AplTeamTool',
      envDir,
      jsonPathExpression: '$.teamConfig.*.apps',
      pathGlob: `${envDir}/env/teams/*/*apps{.yaml,.yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'team',
      resourceDir: '.',
    },
    {
      kind: 'AplTeamPolicy',
      envDir,
      jsonPathExpression: '$.teamConfig.*.policies',
      pathGlob: `${envDir}/env/teams/*/policies.yaml`,
      processAs: 'mapItem',
      resourceGroup: 'team',
      resourceDir: '.',
    },
  ]
}

export function hasCorrespondingDecryptedFile(filePath: string, fileList: Array<string>): boolean {
  return fileList.includes(`${filePath}.dec`)
}

export async function saveValues(
  envDir: string,
  valuesPublic: Record<string, any>,
  valuesSecrets: Record<string, any>,
  deps = { saveResourceGroupToFiles },
): Promise<void> {
  const fileMaps = getFileMaps(envDir)
  await Promise.all(
    fileMaps.map(async (fileMap) => {
      await deps.saveResourceGroupToFiles(fileMap, valuesPublic, valuesSecrets)
    }),
  )
}

export function renderManifest(fileMap: FileMap, jsonPath: jsonpath.PathComponent[], data: Record<string, any>) {
  const manifest = {
    kind: fileMap.kind,
    metadata: {
      name: getResourceName(fileMap, jsonPath, data),
      labels: {},
    },
    spec: data,
  }
  if (fileMap.resourceGroup === 'team') {
    manifest.metadata.labels['apl.io/teamId'] = getTeamNameFromJsonPath(jsonPath)
  }

  return manifest
}

export function renderManifestForSecrets(fileMap: FileMap, data: Record<string, any>) {
  return {
    kind: fileMap.kind,
    spec: data,
  }
}

export async function saveResourceGroupToFiles(
  fileMap: FileMap,
  valuesPublic: Record<string, any>,
  valuesSecrets: Record<string, any>,
  deps = { writeValuesToFile },
): Promise<void> {
  const jsonPathsValuesPublic = jsonpath.nodes(valuesPublic, fileMap.jsonPathExpression)
  const jsonPathsvaluesSecrets = jsonpath.nodes(valuesSecrets, fileMap.jsonPathExpression)

  await Promise.all(
    jsonPathsValuesPublic.map(async (node) => {
      const nodePath = node.path
      const nodeValue = node.value
      try {
        const filePath = getFilePath(fileMap, nodePath, nodeValue, '')
        const manifest = renderManifest(fileMap, nodePath, nodeValue)
        await deps.writeValuesToFile(filePath, manifest)
      } catch (e) {
        console.log(nodePath)
        console.log(fileMap)
        throw e
      }
    }),
  )

  await Promise.all(
    jsonPathsvaluesSecrets.map(async (node) => {
      const nodePath = node.path
      const nodeValue = node.value
      try {
        const filePath = getFilePath(fileMap, nodePath, nodeValue, 'secrets.')
        const manifest = renderManifestForSecrets(fileMap, nodeValue)
        await deps.writeValuesToFile(filePath, manifest)
      } catch (e) {
        console.log(nodePath)
        console.log(fileMap)
        throw e
      }
    }),
  )
}

export async function setValuesFile(envDir: string, deps = { pathExists, loadValues, writeFile }): Promise<string> {
  const valuesPath = path.join(envDir, 'values-repo.yaml')
  if (await deps.pathExists(valuesPath)) return valuesPath
  const allValues = await deps.loadValues(envDir)
  await deps.writeFile(valuesPath, objectToYaml(allValues))
  return valuesPath
}

export async function unsetValuesFile(envDir: string): Promise<string> {
  const valuesPath = path.join(envDir, 'values-repo.yaml')
  await rm(valuesPath, { force: true })
  return valuesPath
}

export function unsetValuesFileSync(envDir: string): string {
  const valuesPath = path.join(envDir, 'values-repo.yaml')
  rmSync(valuesPath, { force: true })
  return valuesPath
}

export async function loadValues(envDir: string, deps = { loadToSpec }): Promise<Record<string, any>> {
  const fileMaps = getFileMaps(envDir)
  const spec = {}

  await Promise.all(
    fileMaps.map(async (fileMap) => {
      await deps.loadToSpec(spec, fileMap)
    }),
  )
  return spec
}

export function extractTeamDirectory(filePath: string): string {
  const match = filePath.match(/\/teams\/([^/]+)/)
  if (match === null) throw new Error(`Cannot extract team name from ${filePath} string`)
  return match[1]
}

export function getJsonPath(fileMap: FileMap, filePath: string): string {
  let { jsonPathExpression: jsonPath } = fileMap

  if (fileMap.resourceGroup === 'team') {
    const teamName = extractTeamDirectory(filePath)
    jsonPath = jsonPath.replace('teamConfig.*', `teamConfig.${teamName}`)
  }

  if (jsonPath.includes('.*')) {
    const fileName = path.basename(filePath, path.extname(filePath))
    const strippedFileName = fileName.replace(/^secrets\.|\.yaml|\.dec$/g, '')
    jsonPath = jsonPath.replace('.*', `.${strippedFileName}`)
  }
  if (jsonPath.includes('[*]')) jsonPath = jsonPath.replace('[*]', '')
  jsonPath = jsonPath.replace('$.', '')
  return jsonPath
}

export function initSpec(fileMap: FileMap, jsonPath: string, spec: Record<string, any>) {
  if (fileMap.processAs === 'arrayItem') {
    set(spec, jsonPath, [])
  } else {
    set(spec, jsonPath, {})
  }
}

export async function loadToSpec(
  spec: Record<string, any>,
  fileMap: FileMap,
  deps = { loadFileToSpec },
): Promise<void> {
  const globOptions = {
    nodir: true, // Exclude directories
    dot: false,
  }
  const files: string[] = globSync(fileMap.pathGlob, globOptions).sort()
  const promises: Promise<void>[] = []

  files.forEach((filePath) => {
    const jsonPath = getJsonPath(fileMap, filePath)
    initSpec(fileMap, jsonPath, spec)
    if (hasCorrespondingDecryptedFile(filePath, files)) return
    promises.push(deps.loadFileToSpec(filePath, fileMap, spec))
  })

  await Promise.all(promises)
}

export async function loadFileToSpec(
  filePath: string,
  fileMap: FileMap,
  spec: Record<string, any>,
  deps = { loadYaml },
): Promise<void> {
  const jsonPath = getJsonPath(fileMap, filePath)
  const data = await deps.loadYaml(filePath)
  if (fileMap.processAs === 'arrayItem') {
    const ref: Record<string, any>[] = get(spec, jsonPath)
    ref.push(data?.spec)
  } else {
    const ref: Record<string, any> = get(spec, jsonPath)
    // Decrypted secrets may need to be merged with plain text specs
    const newRef = merge(cloneDeep(ref), data?.spec)
    set(spec, jsonPath, newRef)
  }
}

export async function getKmsSettings(envDir: string, deps = { loadToSpec }): Promise<Record<string, any>> {
  const fileMap = getFileMaps(envDir)
  const kmsFiles = fileMap.find((item) => item.jsonPathExpression === '$.kms')
  const spec = {}
  await deps.loadToSpec(spec, kmsFiles!)
  return spec
}
