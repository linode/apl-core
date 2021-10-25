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

const writeValueToPlainAndSecret = (
  plain: Record<string, any>,
  secrets: Record<string, any>,
  file: string,
  overwrite: boolean,
): Promise<void>[] => {
  const promises: Promise<void>[] = []

  if (secrets[file])
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/secrets.${file}.yaml`, secrets[file], overwrite))
  // creating non secret files
  if (plain[file])
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/${file}.yaml`, { cluster: plain[file] }, overwrite))

  return promises
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
  const customFiles = ['cluster', 'policies', 'teamConfig']
  const fieldsToOmit = [...customFiles, 'charts']
  const secretSettings = omit(secrets, fieldsToOmit)
  const settings = omit(plainValues, fieldsToOmit)

  const promises: Promise<void>[] = []

  promises.push(...writeValueToPlainAndSecret({ settings }, { settings: secretSettings }, 'settings', overwrite))
  customFiles.map((file) => {
    promises.push(...writeValueToPlainAndSecret(plainValues, secrets, file, overwrite))
    return file
  })

  const plainChartPromises = Object.keys(plainValues.charts || {}).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: plainValues.charts[chart],
      },
    }
    return writeValuesToFile(`${env.ENV_DIR}/env/charts/${chart}.yaml`, valueObject, overwrite)
  })
  const secretChartPromises = Object.keys((secrets.charts || {}) as Record<string, unknown>).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: values.charts[chart],
      },
    }
    return writeValuesToFile(`${env.ENV_DIR}/env/charts/secrets.${chart}.yaml`, valueObject, overwrite)
  })

  await Promise.all([...promises, ...secretChartPromises, ...plainChartPromises])

  d.info('All values were written to ENV_DIR')
}
