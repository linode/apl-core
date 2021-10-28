import cleanDeep, { CleanOptions } from 'clean-deep'
import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import { dump } from 'js-yaml'
import { cloneDeep, isEmpty, isEqual, merge, omit, pick } from 'lodash'
import { env } from './envalid'
import { extract, flattenObject, getValuesSchema, loadYaml, terminal } from './utils'

const objectToYaml = (obj: Record<string, any>): string => {
  return isEmpty(obj) ? '' : dump(obj, { indent: 4 })
}

const removeBlankAttributes = (obj: Record<string, any>): Record<string, any> => {
  const options: CleanOptions = {
    emptyArrays: false,
    emptyObjects: true,
    emptyStrings: true,
    nullValues: false,
    undefinedValues: true,
  }
  return cleanDeep(obj, options)
}

let hasSops = false
/**
 * Writes new values to a file. Will keep the original values if `overwrite` is `false`.
 */
const writeValuesToFile = async (targetPath: string, values: Record<string, any>, overwrite = true): Promise<void> => {
  const d = terminal('values:writeValuesToFile')
  const nonEmptyValues = removeBlankAttributes(values)
  d.debug('nonEmptyValues: ', JSON.stringify(nonEmptyValues, null, 2))
  if (!existsSync(targetPath)) {
    return writeFile(targetPath, objectToYaml(nonEmptyValues))
  }
  const suffix = targetPath.includes('/secrets.') && hasSops ? '.dec' : ''
  const originalValues = loadYaml(`${targetPath}${suffix}`, { noError: true }) ?? {}
  d.debug('originalValues: ', JSON.stringify(originalValues, null, 2))
  const mergeResult = merge(cloneDeep(originalValues), nonEmptyValues, !overwrite ? originalValues : {})
  if (isEqual(originalValues, mergeResult)) {
    d.info(`No changes for ${targetPath}${suffix}, skipping...`)
    return undefined
  }
  d.debug('mergeResult: ', JSON.stringify(mergeResult, null, 2))
  const res = writeFile(`${targetPath}${suffix}`, objectToYaml(mergeResult))
  d.info(`Values were written to ${targetPath}${suffix}`)
  return res
}

/**
 * Writes new values to the repo. Will keep the original values if `overwrite` is `false`.
 */
export const writeValues = async (values: Record<string, any>, overwrite = true): Promise<void> => {
  const d = terminal('values:writeValues')
  hasSops = existsSync(`${env.ENV_DIR}/.sops.yaml`)

  // creating secret files
  const schema = await getValuesSchema()
  const leaf = 'x-secret'
  const schemaSecrets = extract(schema, leaf, (val: any) => (val.length > 0 ? `{{ ${val} }}` : val))
  d.debug('schemaSecrets: ', JSON.stringify(schemaSecrets, null, 2))
  // Get all JSON paths for secrets, without the .x-secret appended
  const secretsJsonPath = Object.keys(flattenObject(schemaSecrets)).map((v) => v.replaceAll(`.${leaf}`, ''))
  d.debug('secretsJsonPath: ', secretsJsonPath)
  const secrets = removeBlankAttributes(pick(values, secretsJsonPath))
  d.debug('secrets: ', JSON.stringify(secrets, null, 2))
  // removing secrets
  const plainValues = removeBlankAttributes(omit(values, secretsJsonPath)) as any
  const fieldsToOmit = ['cluster', 'policies', 'teamConfig', 'charts', 'internal']
  const secretSettings = omit(secrets, fieldsToOmit)
  const settings = omit(plainValues, fieldsToOmit)

  const promises: Promise<void>[] = []

  if (settings) promises.push(writeValuesToFile(`${env.ENV_DIR}/env/settings.yaml`, settings, overwrite))
  if (secretSettings)
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/secrets.settings.yaml`, secretSettings, overwrite))
  // creating non secret files
  if (plainValues.cluster)
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/cluster.yaml`, { cluster: plainValues.cluster }, overwrite))
  if (plainValues.policies)
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/policies.yaml`, { policies: plainValues.policies }, overwrite))

  const plainChartPromises = Object.keys((plainValues.charts || {}) as Record<string, any>).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: plainValues.charts[chart],
      },
    }
    return writeValuesToFile(`${env.ENV_DIR}/env/charts/${chart}.yaml`, valueObject, overwrite)
  })
  const secretChartPromises = Object.keys((secrets.charts || {}) as Record<string, any>).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: secrets.charts[chart],
      },
    }
    return writeValuesToFile(`${env.ENV_DIR}/env/charts/secrets.${chart}.yaml`, valueObject, overwrite)
  })

  await Promise.all([...promises, ...secretChartPromises, ...plainChartPromises])

  d.info('All values were written to ENV_DIR')
}
