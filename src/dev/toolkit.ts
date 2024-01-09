#!/usr/bin/env node --nolazy -r ts-node/register

import { createFileSync, mkdirpSync, writeFile } from 'fs-extra'
import { get, set } from 'lodash'
import { loadYaml } from 'src/common/utils'
import { objectToYaml } from 'src/common/values'

export const addApp = async (name: string): Promise<void> => {
  const projectDir = process.cwd()
  const valuesFile = `${projectDir}/values/${name}/${name}.gotmpl`
  const artifactsFile = `${projectDir}/values/${name}/${name}-raw.gotmpl`
  const chartDir = `charts/${name}`
  const valuesDir = `values/${name}`
  const valuesSchemaPath = `${projectDir}/values-schema.yaml`
  const corePath = `${projectDir}/core.yaml`
  const appsPath = `${projectDir}/apps.yaml`
  const defaultsPath = `${projectDir}/helmfile.d/snippets/defaults.yaml`
  const helmfilePath = `${projectDir}/helmfile-${name}.yaml`
  const fixturesPath = `${projectDir}/tests/fixtures/env/apps/${name}.yaml`
  const secretFixturesPath = `${projectDir}/tests/fixtures/env/apps/secrets.${name}.yaml`
  mkdirpSync(chartDir)
  mkdirpSync(valuesDir)
  createFileSync(artifactsFile)
  createFileSync(valuesFile)

  const appData = (await loadYaml(valuesSchemaPath)) || {}
  const appDataChunk = {
    additionalProperties: false,
    properties: {
      _rawValues: {
        $ref: '#/definitions/rawValues',
      },
      enabled: {
        type: 'boolean',
        default: false,
      },
      resources: {
        $ref: '#/definitions/resources',
      },
    },
  }
  set(appData, `properties.apps.${name}`, appDataChunk)
  await writeFile(valuesSchemaPath, objectToYaml(appData))

  const coredata = (await loadYaml(corePath)) || {}
  const coreDataChunk = {
    name: {
      app: name,
      disableIstioInjection: true,
      disablePolicyChecks: true,
    },
  }

  const namespaces = get(coredata, `k8s.namespaces`) as Record<string, any>
  namespaces.push(coreDataChunk)
  await writeFile(corePath, objectToYaml(coredata))

  const appsData = (await loadYaml(appsPath)) || {}
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
  await writeFile(appsPath, objectToYaml(appsData))

  const defaultsData = (await loadYaml(defaultsPath)) || {}
  const defaultsDataChunk = {
    enabled: false,
  }

  set(defaultsData, `environments.default.values[0].apps.${name}`, defaultsDataChunk)
  await writeFile(defaultsPath, objectToYaml(defaultsData))

  const helmfileReleaseChunk = {
    releases: [
      {
        name,
        installed: `{{ $a | get "${name}.enabled" }}'`,
        namespace: name,
        '<<': '*default',
      },
    ],
  }

  await writeFile(helmfilePath, objectToYaml(helmfileReleaseChunk))

  const fixturesData = {}
  const fixturesDataChunk = { enabled: true }
  set(fixturesData, `apps.${name}`, fixturesDataChunk)
  await writeFile(fixturesPath, objectToYaml(fixturesData))
}

addApp('sealed-secrets')
