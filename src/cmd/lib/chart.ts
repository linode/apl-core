import { existsSync, promises as fsPromises } from 'fs'
import { dump } from 'js-yaml'
import { cloneDeep, isEmpty, merge, omit, pick } from 'lodash-es'
import { env } from '../../common/envalid'
import { extract, flattenObject, getValuesSchema, loadYaml, terminal } from '../../common/utils'

const { writeFile } = fsPromises
const debug = terminal('chart')
let hasSops = false

const objectToString = (obj: Record<string, any>): string => {
  return isEmpty(obj) ? '' : dump(obj)
}

export const mergeValueIntoFile = async (
  targetPath: string,
  toBeMergedValues: Record<string, any>,
  overwrite = true,
): Promise<void> => {
  debug.debug(`targetPath: ${targetPath}, values: ${JSON.stringify(toBeMergedValues)}`)
  if (!existsSync(targetPath)) {
    // If the targetPath doesn't exist, just create it and write the valueObject in it.
    // It doesn't matter if it is secret or not. and always write in its yaml file
    return writeFile(targetPath, objectToString(toBeMergedValues))
  }
  const suffix = targetPath.includes('/secrets.') && hasSops ? '.dec' : ''

  const originalValues = loadYaml(`${targetPath}${suffix}`, { noError: true }) ?? {}

  const mergeResult = merge(cloneDeep(originalValues), toBeMergedValues, !overwrite ? originalValues : {})
  return writeFile(`${targetPath}${suffix}`, objectToString(mergeResult))
}

export const getChartValues = (): any | undefined => {
  return env.VALUES_INPUT ? loadYaml(env.VALUES_INPUT) : undefined
}

export const mapValuesObjectIntoFiles = async (values: Record<string, any>, overwrite = true): Promise<void> => {
  hasSops = existsSync(`${env.ENV_DIR}/.sops.yaml`)

  // creating secret files
  const schema = await getValuesSchema()
  const leaf = 'x-secret'
  const schemaSecrets = extract(schema, leaf, (val: any) => (val.length > 0 ? `{{ ${val} }}` : val))
  // Get all JSON paths for secrets, without the .x-secret appended
  const secretsJsonPath = Object.keys(flattenObject(schemaSecrets)).map((v) => v.replaceAll(`.${leaf}`, ''))
  debug.debug('secretsJsonPath: ', secretsJsonPath)
  const secrets = pick(values, secretsJsonPath)
  // removing secrets
  const plainValues = omit(values, secretsJsonPath) as any
  const fieldsToOmit = ['cluster', 'policies', 'teamConfig', 'charts']
  const secretSettings = omit(secrets, fieldsToOmit)
  const settings = omit(plainValues, fieldsToOmit)

  const promises: Promise<void>[] = []

  if (settings) promises.push(mergeValueIntoFile(`${env.ENV_DIR}/env/settings.yaml`, settings, overwrite))
  if (secretSettings)
    promises.push(mergeValueIntoFile(`${env.ENV_DIR}/env/secrets.settings.yaml`, secretSettings, overwrite))
  // creating non secret files
  if (plainValues.cluster)
    promises.push(mergeValueIntoFile(`${env.ENV_DIR}/env/cluster.yaml`, { cluster: plainValues.cluster }, overwrite))
  if (plainValues.policies)
    promises.push(mergeValueIntoFile(`${env.ENV_DIR}/env/policies.yaml`, { policies: plainValues.policies }, overwrite))

  const plainChartPromises = Object.keys(plainValues.charts || {}).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: plainValues.charts[chart],
      },
    }
    return mergeValueIntoFile(`${env.ENV_DIR}/env/charts/${chart}.yaml`, valueObject, overwrite)
  })
  const secretChartPromises = Object.keys((secrets.charts || {}) as Record<string, unknown>).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: values.charts[chart],
      },
    }
    return mergeValueIntoFile(`${env.ENV_DIR}/env/charts/secrets.${chart}.yaml`, valueObject, overwrite)
  })

  await Promise.all([...promises, ...secretChartPromises, ...plainChartPromises])

  debug.log('Chart values merged with the bootstrapped values.')
}
