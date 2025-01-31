import { globSync } from 'glob'
import { cloneDeep, merge } from 'lodash'
import path from 'path'
import { env } from './envalid'
import { getDirNames, isPathMatch, loadYaml } from './utils'
import { objectToYaml, writeValuesToFile } from './values'

export const getTeamNames = async (): Promise<Array<string>> => {
  const teamsDir = path.join(env.ENV_DIR, 'env', 'teams')
  const teamNames = await getDirNames(teamsDir, { skipHidden: true })
  return teamNames
}

// loadAsArrayPathFilters - use '**' to match multiple directories
export const loadAsArrayPathFilters = [
  '**/teams/*/builds/*',
  '**/teams/*/workloads/*',
  '**/teams/*/services/*',
  '**/teams/*/netpols/*',
]

const resourceMap = {
  team: {
    settings: {
      globPattern: '**/teams/*/*settings.yaml.*',
      convertFileTo: 'map',
    },
    builds: {
      globPattern: '**/teams/*/builds/*',
      convertFileTo: 'array',
    },
    workloads: {
      globPattern: '**/teams/*/workloads/*',
      convertFileTo: 'array',
    },
    services: {
      globPattern: '**/teams/*/services/*',
      convertFileTo: 'array',
    },
    netpols: {
      globPattern: '**/teams/*/netpols/*',
      convertFileTo: 'array',
    },
    secrets: {
      globPattern: '**/teams/*/secrets/*',
      convertFileTo: 'array',
    },
  },
  platform: {
    apps: {},
    settings: {},
  },
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
  const teamDir = path.join(env.ENV_DIR, 'env', 'teams', teamName)
  const teamPromises: Promise<void>[] = []
  const teamPaths = deps.globSync(`${teamDir}/**/*.{yaml,yaml.dec}`, {
    ignore: `${teamDir}/sealedsecrets/**`,
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
