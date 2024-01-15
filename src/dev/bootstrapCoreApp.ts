import { createFileSync, mkdirpSync, writeFile } from 'fs-extra'
import { set } from 'lodash'
import { terminal } from 'src/common/debug'
import { objectToYaml } from 'src/common/values'

const d = terminal('bootstrapCoreApp')
const indent = 2

const generateValuesSchema = async (projectDir: string, name: string): Promise<void> => {
  const valuesSchemaPath = `${projectDir}/values-schema.yaml`
  const valuesSchemaChunkPath = `${valuesSchemaPath}.chunk`
  const schema = {}
  const schemaChunk = {
    additionalProperties: false,
    properties: {
      _rawValues: {
        $ref: '#/definitions/rawValues',
      },
      enabled: {
        type: 'boolean',
        default: true,
      },
      resources: {
        properties: {
          operator: {
            description: 'the operator property can be any arbitray string (change it if needed',
            $ref: '#/definitions/resources',
          },
        },
      },
    },
  }
  set(schema, `definitions.apps.properties.${name}`, schemaChunk)
  await writeFile(valuesSchemaChunkPath, objectToYaml(schema, indent))
  d.info(`Generated ${valuesSchemaChunkPath} file.`)
}

const generateCoreFile = async (projectDir: string, name: string): Promise<void> => {
  const corePath = `${projectDir}/core.yaml`
  const coreChunkPath = `${corePath}.chunk`
  const coreData = {}
  const coreDataChunk = {
    name,
    app: name,
    disableIstioInjection: true,
    disablePolicyChecks: true,
  }

  set(coreData, 'k8s.namespaces[0]', coreDataChunk)

  await writeFile(coreChunkPath, objectToYaml(coreData, indent))
  d.info(`Generated ${coreChunkPath} file.`)
}

const generateAppsFile = async (projectDir: string, name: string): Promise<void> => {
  const appsPath = `${projectDir}/apps.yaml`
  const appsChunkPath = `${appsPath}.chunk`
  const appsData = {}
  const appsDataChunk = {
    title: 'title',
    appVersion: 'appVersion',
    repo: 'repo',
    maintainers: '',
    relatedLinks: [],
    license: 'license',
    dependencies: '',
    about: 'about',
    integration: 'integration',
  }
  set(appsData, `appsInfo.${name}`, appsDataChunk)
  await writeFile(appsChunkPath, objectToYaml(appsData, indent))
  d.info(`Generated ${appsChunkPath} file.`)
}

const generateHelmfileFile = async (projectDir: string, name: string): Promise<void> => {
  const helmfilePath = `${projectDir}/helmfile-${name}.yaml`
  const helmfileChunkPath = `${helmfilePath}.chunk`
  const helmfileReleaseChunk = {
    releases: [
      {
        name,
        installed: `{{ $a | get "${name}.enabled" }}`,
        namespace: name,
        '<<': '*default',
      },
    ],
  }

  await writeFile(helmfileChunkPath, objectToYaml(helmfileReleaseChunk, indent))
  d.info(`Generated ${helmfileChunkPath} file.`)
}

const generateDefaultsFile = async (projectDir: string, name: string): Promise<void> => {
  const defaultsData = {}
  const defaultsDataChunk = {
    enabled: true,
  }

  const defaultsPath = `${projectDir}/helmfile.d/snippets/defaults.yaml`
  const defaultsChunkPath = `${defaultsPath}.chunk`
  set(defaultsData, `environments.default.values[0].apps.${name}`, defaultsDataChunk)
  await writeFile(defaultsChunkPath, objectToYaml(defaultsData, indent))
  d.info(`Generated ${defaultsChunkPath} file.`)
}

const generateFixtureFiles = async (projectDir: string, name: string): Promise<void> => {
  const fixturesPath = `${projectDir}/tests/fixtures/env/apps/${name}.yaml`
  const secretFixturesPath = `${projectDir}/tests/fixtures/env/apps/secrets.${name}.yaml`
  const fixturesData = {}
  const fixturesDataChunk = { enabled: true }
  set(fixturesData, `apps.${name}`, fixturesDataChunk)
  await writeFile(fixturesPath, objectToYaml(fixturesData))
  d.info(`Generated ${fixturesPath} file.`)

  const secrets = {}
  set(secrets, `apps.${name}`, {})
  await writeFile(secretFixturesPath, objectToYaml(secrets))
  d.info(`Generated ${secretFixturesPath} file.`)
}

const generateHelmChartValues = (projectDir: string, name: string): void => {
  const valuesFile = `${projectDir}/values/${name}/${name}.gotmpl`
  const artifactsFile = `${projectDir}/values/${name}/${name}-raw.gotmpl`
  const valuesDir = `values/${name}`
  mkdirpSync(valuesDir)
  createFileSync(artifactsFile)
  d.info(`Generated ${artifactsFile} file.`)
  createFileSync(valuesFile)
  d.info(`Generated ${valuesFile} file.`)
}

const generateHelmChart = (projectDir: string, name: string): void => {
  const chartDir = `${projectDir}/charts/${name}`
  mkdirpSync(chartDir)
  d.info(`Generated ${chartDir} dir.`)
}

export const addApp = async (name: string): Promise<void> => {
  d.info(`Generating files for the ${name} app`)

  const projectDir = process.cwd()

  await generateValuesSchema(projectDir, name)
  await generateCoreFile(projectDir, name)
  await generateAppsFile(projectDir, name)
  await generateDefaultsFile(projectDir, name)
  await generateHelmfileFile(projectDir, name)
  await generateFixtureFiles(projectDir, name)
  generateHelmChart(projectDir, name)
  generateHelmChartValues(projectDir, name)
  const cmd = "find . -name '*.chunk' -type f  -exec rm {} \\;"
  d.info('File with the .chunk extenstion needs to merged with their corresponding peers')
  d.info(`Remove chunks with the following command: "${cmd}"`)
}

if (typeof require !== 'undefined' && require.main === module) {
  d.info(process.argv)
  const appName = process.argv[2] || 'my-app'
  addApp(appName.trim())
}
