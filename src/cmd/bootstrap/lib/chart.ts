import $RefParser from '@apidevtools/json-schema-ref-parser'
import { cleanEnv, str } from 'envalid'
import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import yaml from 'js-yaml'
import { merge as _merge, omit, pick } from 'lodash'
import { terminal } from '../../../common/debug'
import { env } from '../../../common/envalid'
import { loadYaml } from '../../../common/utils'

const debug = terminal('mergeValues')
let hasSops = false
const extractSecrets = (schema: any, parentAddress?: string): Array<string> => {
  const schemaKeywords = ['properties', 'anyOf', 'allOf', 'oneOf']

  return Object.keys(schema)
    .flatMap((key) => {
      const childObj = schema[key]
      if (typeof childObj !== 'object') return false
      if ('x-secret' in childObj) return parentAddress ? `${parentAddress}.${key}` : key
      let address = `${parentAddress}.${key}`
      if (parentAddress === undefined) address = key
      else if (schemaKeywords.includes(key) || !Number.isNaN(Number(key))) address = parentAddress
      return extractSecrets(childObj, address)
    })
    .filter(Boolean) as Array<string>
}

const mergeValues = async (targetPath: string, newValues: Record<string, unknown>): Promise<void> => {
  debug.debug(`targetPath: ${targetPath}, values: ${JSON.stringify(newValues)}`)
  if (!existsSync(targetPath)) {
    // If the targetPath doesn't exist, just create it and write the valueObject in it.
    // It doesn't matter if it is secret or not. and always write in its yaml file
    return writeFile(targetPath, yaml.dump(newValues ?? {}))
  }
  const suffix = targetPath.includes('/secrets.') && hasSops ? '.dec' : ''

  const values = loadYaml(`${targetPath}${suffix}`, { noError: true }) ?? {}
  _merge(values, newValues)
  return writeFile(`${targetPath}${suffix}`, yaml.dump(values))
}

export const merge = async (): Promise<void> => {
  const cleanedEnv = cleanEnv(process.env, {
    VALUES_INPUT: str({ desc: 'The chart values.yaml file' }),
    SCHEMA_PATH: str({ desc: 'The path to the values-schema.yaml schema file' }),
  })
  hasSops = existsSync(`${env.ENV_DIR}/.sops.yaml`)
  const values = loadYaml(cleanedEnv.VALUES_INPUT)

  // creating secret files
  const schema = loadYaml('values-schema.yaml')
  const derefSchema = await $RefParser.dereference(schema)
  const cleanSchema = omit(derefSchema, ['definitions', 'properties.teamConfig']) // FIXME: lets fix the team part later
  const secretsJsonPath = extractSecrets(cleanSchema)
  const secrets = pick(values, secretsJsonPath)
  // removing secrets
  const plainValues = omit(values, secretsJsonPath) as any
  const fieldsToOmit = ['cluster', 'policies', 'teamConfig', 'charts']
  const secretSettings = omit(secrets, fieldsToOmit)
  const settings = omit(plainValues, fieldsToOmit)
  // mergeValues(`${env.ENV_DIR}/env/secrets.teams.yaml`, { teamConfig: secrets.teamConfig }) // FIXME: lets fix the team part later

  const individualPromises: Promise<void>[] = []

  if (settings) individualPromises.push(mergeValues(`${env.ENV_DIR}/env/settings.yaml`, settings))
  if (secretSettings) individualPromises.push(mergeValues(`${env.ENV_DIR}/env/secrets.settings.yaml`, secretSettings))
  // creating non secret files
  if (plainValues.cluster)
    individualPromises.push(mergeValues(`${env.ENV_DIR}/env/cluster.yaml`, { cluster: plainValues.cluster }))
  if (plainValues.policies)
    individualPromises.push(mergeValues(`${env.ENV_DIR}/env/policies.yaml`, { policies: plainValues.policies }))
  if (plainValues.teamConfig)
    individualPromises.push(mergeValues(`${env.ENV_DIR}/env/teams.yaml`, { teamConfig: plainValues.teamConfig }))

  const plainChartPromises = Object.keys(plainValues.charts).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: plainValues.charts[chart],
      },
    }
    return mergeValues(`${env.ENV_DIR}/env/charts/${chart}.yaml`, valueObject)
  })
  const secretChartPromises = Object.keys(secrets.charts).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: values.charts[chart],
      },
    }
    return mergeValues(`${env.ENV_DIR}/env/charts/secrets.${chart}.yaml`, valueObject)
  })

  await Promise.all([...individualPromises, ...secretChartPromises, ...plainChartPromises])

  debug.log('otomi chart values merged with the bootstrapped values.')
}
