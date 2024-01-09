#!/usr/bin/env node --nolazy -r ts-node/register

import { createFileSync, mkdirpSync, writeFile } from 'fs-extra'
import { set } from 'lodash'
import { loadYaml } from 'src/common/utils'
import { objectToYaml } from 'src/common/values'

export const addApp = async (name: string): Promise<void> => {
  const projectDir = process.cwd()
  const valuesFile = `${projectDir}/values/${name}.gotmpl`
  const artifactsFile = `${projectDir}/values/${name}-raw.gotmpl`
  const chartDir = `charts/${name}`
  const valuesDir = `values/${name}`
  const valuesSchemaPath = `${projectDir}/values-schema.yaml`
  const corePath = `${projectDir}/core.yaml`
  const appsPath = `${projectDir}/apps.yaml`
  const defaultsPath = `${projectDir}/defaults.yaml`
  const fixturesPath = `${projectDir}/tests/fixtures/apps/${name}.yaml`
  const secretFixturesPath = `${projectDir}/tests/fixtures/apps/secrets.${name}.yaml`
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
      image: {
        $ref: '#/definitions/imageSimple',
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
    name,
    app: name,
    disableIstioInjection: true,
    disablePolicyChecks: true,
  }
  set(coredata, `properties.apps.${name}`, coreDataChunk)
  await writeFile(valuesSchemaPath, objectToYaml(coredata))

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
}

addApp('myapp')
