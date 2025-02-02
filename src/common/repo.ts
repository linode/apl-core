import { globSync } from 'glob'
import jsonpath from 'jsonpath'
import { cloneDeep, get, merge, set } from 'lodash'
import path from 'path'
import { env } from './envalid'
import { getDirNames, isPathMatch, loadYaml } from './utils'
import { objectToYaml, writeValuesToFile } from './values'
export const getTeamNames = async (): Promise<Array<string>> => {
  const teamsDir = path.join(env.ENV_DIR, 'env', 'teams')
  const teamNames = await getDirNames(teamsDir, { skipHidden: true })
  return teamNames
}

export interface FileMap {
  jsonPathExpression: string
  pathGlob: string
  processAs: 'arrayItem' | 'mapItem'
  resourceGroup: 'team' | 'platformSettings' | 'platformApps' | 'platformDatabases' | 'platformBackups' | 'users'
  getFilePath(jsonPath: string, data: Record<string, any>, fileNamePrefix: string): string
}

const getFileMaps = (envDir: string): Array<FileMap> => {
  return [
    {
      jsonPathExpression: 'apps.*',
      pathGlob: `${envDir}/env/apps/*.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformApps',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const resourceName = jsonPath.split('.')[1]
        return `${envDir}/env/apps/${fileNamePrefix}${resourceName}.yaml`
      },
    },
    {
      jsonPathExpression: 'alerts',
      pathGlob: `${envDir}/env/settings/alerts.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/${fileNamePrefix}alerts.yaml`
      },
    },
    {
      jsonPathExpression: 'cluster',
      pathGlob: `${envDir}/env/settings/dns.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/${fileNamePrefix}cluster.yaml`
      },
    },
    {
      jsonPathExpression: 'databases.*',
      pathGlob: `${envDir}/env/databases/*.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformDatabases',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const resourceName = jsonPath.split('.')[1]
        return `${envDir}/env/databases/${resourceName}.yaml`
      },
    },
    {
      jsonPathExpression: 'dns',
      pathGlob: `${envDir}/env/settings/*dns.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/${fileNamePrefix}dns.yaml`
      },
    },
    {
      jsonPathExpression: 'ingress',
      pathGlob: `${envDir}/env/settings/ingress.yaml}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/ingress.yaml`
      },
    },
    {
      jsonPathExpression: 'kms',
      pathGlob: `${envDir}/env/settings/*kms.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/${fileNamePrefix}kms.yaml`
      },
    },
    {
      jsonPathExpression: 'obj',
      pathGlob: `${envDir}/env/settings/*obj.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/${fileNamePrefix}obj.yaml`
      },
    },
    {
      jsonPathExpression: 'oidc',
      pathGlob: `${envDir}/env/settings/*oidc.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/${fileNamePrefix}oidc.yaml`
      },
    },
    {
      jsonPathExpression: 'otomi',
      pathGlob: `${envDir}/env/settings/*otomi.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/${fileNamePrefix}otomi.yaml`
      },
    },
    {
      jsonPathExpression: 'platformBackups',
      pathGlob: `${envDir}/env/settings/platformBackups.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'platformBackups',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/platformBackups.yaml`
      },
    },
    {
      jsonPathExpression: 'users[*]',
      pathGlob: `${envDir}/env/users/*.{yaml,yaml.dec}`,
      processAs: 'arrayItem',
      resourceGroup: 'users',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const resourceName = data.name
        return `${envDir}/env/users/${fileNamePrefix}${resourceName}`
      },
    },
    {
      jsonPathExpression: '',
      pathGlob: `${envDir}/env/settings/version.yaml`,
      processAs: 'mapItem',
      resourceGroup: 'platformSettings',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        return `${envDir}/env/settings/version.yaml`
      },
    },
    {
      jsonPathExpression: 'teamConfig.*.builds[*]',
      pathGlob: `${envDir}/env/teams/*/builds/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const fileName = data.name
        const teamName = jsonPath.split('.')[1]
        return `${envDir}/env/teams/${teamName}/builds/${fileName}.yaml`
      },
    },
    {
      jsonPathExpression: 'teamConfig.*.workloads[*]',
      pathGlob: `${envDir}/env/teams/*/workloads/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const fileName = data.name
        const teamName = jsonPath.split('.')[1]
        return `${envDir}/env/teams/${teamName}/workloads/${fileName}.yaml`
      },
    },
    {
      jsonPathExpression: 'teamConfig.*.services[*]',
      pathGlob: `${envDir}/env/teams/*/services/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const fileName = data.name
        const teamName = jsonPath.split('.')[1]
        return `${envDir}/env/teams/${teamName}/services/${fileName}.yaml`
      },
    },
    {
      jsonPathExpression: 'teamConfig.*.sealedsecrets[*]',
      pathGlob: `${envDir}/env/teams/*/sealedsecrets/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const fileName = data.name
        const teamName = jsonPath.split('.')[1]
        return `${envDir}/env/teams/${teamName}/sealedsecrets/${fileName}.yaml`
      },
    },
    {
      jsonPathExpression: 'teamConfig.*.backups[*]',
      pathGlob: `${envDir}/env/teams/*/backups/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const fileName = data.name
        const teamName = jsonPath.split('.')[1]
        return `${envDir}/env/teams/${teamName}/backups/${fileName}.yaml`
      },
    },
    {
      jsonPathExpression: 'teamConfig.*.projects[*]',
      pathGlob: `${envDir}/env/teams/*/projects/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const fileName = data.name
        const teamName = jsonPath.split('.')[1]
        return `${envDir}/env/teams/${teamName}/projects/${fileName}.yaml`
      },
    },
    {
      jsonPathExpression: 'teamConfig.*.netpols[*]',
      pathGlob: `${envDir}/env/teams/*/netpols/*.yaml`,
      processAs: 'arrayItem',
      resourceGroup: 'team',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const fileName = data.name
        const teamName = jsonPath.split('.')[1]
        return `${envDir}/env/teams/${teamName}/netpols/${fileName}.yaml`
      },
    },
    {
      jsonPathExpression: 'teamConfig.*.settings',
      pathGlob: `${envDir}/env/teams/*/*settings.{yaml,yaml.dec}`,
      processAs: 'mapItem',
      resourceGroup: 'team',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const teamName = jsonPath.split('.')[1]
        return `${envDir}/env/teams/${teamName}/${fileNamePrefix}settings.yaml`
      },
    },
    {
      jsonPathExpression: 'teamConfig.*.policies',
      pathGlob: `${envDir}/env/teams/*/policies.yaml`,
      processAs: 'mapItem',
      resourceGroup: 'team',
      getFilePath: (jsonPath: string, data: Record<string, any>, fileNamePrefix: '') => {
        const teamName = jsonPath.split('.')[1]
        return `${envDir}/env/teams/${teamName}/policies.yaml`
      },
    },
  ]
}
// loadAsArrayPathFilters - use '**' to match multiple directories
export const loadAsArrayPathFilters = [
  '**/teams/*/builds/*',
  '**/teams/*/workloads/*',
  '**/teams/*/services/*',
  '**/teams/*/netpols/*',
  '**/teams/*/backups/*',
]

export const loadIgnorePAthPatterns = ['**/teams/*/sealedsecrets/**', '**/teams/*/workloadsValues/**']

export const saveTeam = async (
  teamName: string,
  teamSpec: Record<string, any>,
  teamSecrets: Record<string, any>,
  overwrite: boolean,
  deps = {
    writeValuesToFile,
  },
): Promise<string> => {
  const teamDir = getTeamDirPath(teamName)
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
  Object.keys(teamSecrets).map((key) => {
    const settingsSecretsPath = path.join(teamDir, `secrets.${key}.yaml`)
    teamPromises.push(deps.writeValuesToFile(settingsSecretsPath, { spec: teamSecrets[key] }, overwrite))
  })

  await Promise.all(teamPromises)

  return teamDir
}

export const hasCorrespondingDecryptedFile = (filePath: string, fileList: Array<string>): boolean => {
  return fileList.includes(`${filePath}.dec`)
}

export const getTeamConfig = async (
  deps = {
    getTeamNames,
    loadTeam,
  },
): Promise<Record<string, any>> => {
  const teams = await deps.getTeamNames()
  const spec = { teamConfig: {} }

  const promises = teams.map(async (teamName) => {
    spec.teamConfig[teamName] = await deps.loadTeam(teamName)
  })

  await Promise.all(promises)

  return spec
}

export const printTeamConfigAsYaml = (teamConfig: Record<string, any>): string => {
  return objectToYaml(teamConfig, 2, 1000)
}

export const getTeamDirPath = (teamName: string): string => {
  const teamDir = path.join(env.ENV_DIR, 'env', 'teams', teamName)
  return teamDir
}
/**
   * Loads files for a team directory of the following structure. It should be file and directory name agnostic.
   *
   * ./
      ├── <filename-1>.yaml
      ├── <filename-N>.yaml
      ├── <resource-collection-1>/
      │   ├── <res-1-1>.yaml
      │   └── <res-1-N>.yaml
      └── <resource-collection-M>/
          ├── <res-M-1>.yaml
          └── <res-M-N>.yaml
   * Each file has the 'spec' property which is omitted while loading.
   *
   * The team directories and files translate into the following object:
      {
        "<filename-1>": {}
        "<filename-N>": {}
        "<resource-collection-1>": [{content of <res-1-1>.yaml}, {content of <res-1-N>.yaml}] 
        "<resource-collection-M>": [{content of <res-M-1>.yaml}, {content of <res-M-N>.yaml}] 
      }
   *
   * @param teamName
   * @param deps
   */
export const loadTeam = async (
  teamName: string,
  deps = {
    loadTeamFileToSpec,
    globSync,
  },
): Promise<Record<string, any>> => {
  const teamSpec = {}
  const teamDir = getTeamDirPath(teamName)
  const teamPromises: Promise<void>[] = []
  const teamPaths = deps.globSync(`${teamDir}/**/*.{yaml,yaml.dec}`, {
    ignore: loadIgnorePAthPatterns,
  })

  teamPaths.forEach((filePath) => {
    if (hasCorrespondingDecryptedFile(filePath, teamPaths)) return
    teamPromises.push(deps.loadTeamFileToSpec(teamSpec, filePath, loadAsArrayPathFilters))
  })
  await Promise.all(teamPromises)
  return teamSpec
}

export const loadTeamFileToSpec = async (
  teamSpec: Record<string, any>,
  filePath: string,
  loadAsArrayFilters: Array<string>,
  deps = { loadYaml },
) => {
  const spec = teamSpec
  const content = await deps.loadYaml(filePath)
  const fileName = path.basename(filePath, path.extname(filePath))
  const dirName = path.basename(path.dirname(filePath))

  if (isPathMatch(filePath, loadAsArrayFilters)) {
    spec[dirName] = spec[dirName] || []
    spec[dirName].push(content?.spec)
  } else {
    const strippedFileName = fileName.replace(/^secrets\.|\.yaml|\.dec$/g, '')
    // Decrypted secrets may need to be merged with plain text specs
    spec[strippedFileName] = merge(cloneDeep(spec[strippedFileName]), content?.spec)
  }
}

export const save = async (
  envDir: string,
  valuesPublic: Record<string, any>,
  valuesSecrets: Record<string, any>,
  deps = { saveResourceGroupToFiles },
): Promise<void> => {
  const fileMaps = getFileMaps(envDir)
  await Promise.all(
    fileMaps.map(async (fileMap) => {
      await deps.saveResourceGroupToFiles(fileMap, valuesPublic, valuesSecrets)
    }),
  )
}

const extractWildcardValue = (jsonPath, pattern) => {
  // Convert JSONPath pattern to a regex pattern
  const regexPattern = pattern
    .replace('.', '\\.') // Escape dots
    .replace(/\*/g, '([^\\.\\[]+)') // Capture wildcard '*'
    .replace(/\[\*\]/g, '\\[(\\d+)\\]') // Capture array indices '[]'

  const regex = new RegExp(`^${regexPattern}$`)
  const match = jsonPath.match(regex)

  return match ? match.slice(1) : null
}

export const saveResourceGroupToFiles = async (
  fileMap: FileMap,
  valuesPublic: Record<string, any>,
  valuesSecrets: Record<string, any>,
  deps = { loadToSpec },
): Promise<void> => {
  const jsonPathsValuesPublic = jsonpath.paths(valuesPublic, fileMap.jsonPathExpression)
  const jsonPathsvaluesSecrets = jsonpath.paths(valuesSecrets, fileMap.jsonPathExpression)

  await Promise.all(
    jsonPathsValuesPublic.map(async (jp) => {
      const data = get(valuesPublic, jp)
      const filePath = fileMap.getFilePath(jp.toString(), data, '')
      await writeValuesToFile(filePath, data, true)
    }),
  )

  await Promise.all(
    jsonPathsvaluesSecrets.map(async (jp) => {
      const data = get(valuesPublic, jp)
      const filePath = fileMap.getFilePath(jp.toString(), data, 'secrets.')
      await writeValuesToFile(filePath, data, true)
    }),
  )
}

export const load = async (envDir: string, deps = { loadToSpec }): Promise<Record<string, any>> => {
  const fileMaps = getFileMaps(envDir)
  const spec = {}

  await Promise.all(
    fileMaps.map(async (fileMap) => {
      await deps.loadToSpec(spec, fileMap)
    }),
  )
  return spec
}

export const extractTeamDirectory = (filePath: string): string => {
  const match = filePath.match(/\/teams\/([^/]+)/)
  if (match === null) throw new Error(`Cannot extract team name from ${filePath} string`)
  return match[1]
}

export const getJsonPath = (fileMap: FileMap, filePath: string): string => {
  let { jsonPathExpression: jsonPath } = fileMap
  if (jsonPath.includes('teamConfig.*')) {
    const teamName = extractTeamDirectory(filePath)
    jsonPath = jsonPath.replace('teamConfig.*', `teamConfig.${teamName}`)
  }

  if (jsonPath.includes('.*')) {
    const fileName = path.basename(filePath, path.extname(filePath))
    const strippedFileName = fileName.replace(/^secrets\.|\.yaml|\.dec$/g, '')
    jsonPath = jsonPath.replace('.*', `.${strippedFileName}`)
  }
  if (jsonPath.includes('[*]')) jsonPath = jsonPath.replace('[*]', '')
  return jsonPath
}

export const loadToSpec = async (
  spec: Record<string, any>,
  fileMap: FileMap,
  deps = { loadFileToSpec },
): Promise<void> => {
  const files: string[] = globSync(fileMap.pathGlob)
  const promises: Promise<void>[] = []

  files.forEach((filePath) => {
    const jsonPath = getJsonPath(fileMap, filePath)
    if (fileMap.processAs === 'arrayItem') {
      set(spec, jsonPath, [])
    } else {
      set(spec, jsonPath, {})
    }
    promises.push(deps.loadFileToSpec(filePath, fileMap, spec))
  })

  await Promise.all(promises)
}

export const loadFileToSpec = async (
  filePath: string,
  fileMap: FileMap,
  spec: Record<string, any>,
  deps = { loadYaml },
): Promise<void> => {
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
