import { existsSync } from 'fs'
import { writeFile } from 'fs/promises'
import { dump } from 'js-yaml'
import { cloneDeep, isEmpty, isEqual, merge, omit, pick, set } from 'lodash'
import pkg from '../../package.json'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import {
  extract,
  flattenObject,
  getValuesSchema,
  gucci,
  loadYaml,
  removeBlankAttributes,
  stringContainsSome,
} from './utils'

const objectToYaml = (obj: Record<string, any>): string => {
  return isEmpty(obj) ? '' : dump(obj, { indent: 4 })
}

let otomiK8sVersion: string
/**
 * Find the cluster kubernetes version in the values
 * @returns String of the kubernetes version on the cluster
 */
export const getK8sVersion = (): string => {
  if (otomiK8sVersion) return otomiK8sVersion
  const clusterFile: any = loadYaml(`${env().ENV_DIR}/env/cluster.yaml`)
  otomiK8sVersion = clusterFile.cluster!.k8sVersion!
  return otomiK8sVersion
}

/**
 * Find what image tag is defined in configuration for otomi
 * @returns string
 */
export const getImageTag = async (isBootstrap = false): Promise<string> => {
  if (process.env.OTOMI_TAG) return process.env.OTOMI_TAG
  if (isBootstrap) return `v${pkg.version}`
  const values = await hfValues()
  return values!.otomi!.version
}

let hasSops = false
/**
 * Writes new values to a file. Will keep the original values if `overwrite` is `false`.
 */
const writeValuesToFile = async (
  targetPath: string,
  inValues: Record<string, any>,
  overwrite = true,
): Promise<void> => {
  const values = cloneDeep(inValues)
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
  d.debug('Writing values: ', values)
  hasSops = existsSync(`${env().ENV_DIR}/.sops.yaml`)
  // creating secret files
  const schema = await getValuesSchema()
  const leaf = 'x-secret'
  const schemaSecrets = extract(schema, leaf, (val: any) => (val.length > 0 ? `{{ ${val} }}` : val))
  d.debug('schemaSecrets: ', JSON.stringify(schemaSecrets, null, 2))
  // Get all JSON paths for secrets, without the .x-secret appended
  const secretsJsonPath = Object.keys(flattenObject(schemaSecrets)).map((v) => v.replaceAll(`.${leaf}`, ''))
  d.debug('secretsJsonPath: ', secretsJsonPath)
  // separate out the secrets
  const secrets = removeBlankAttributes(pick(values, secretsJsonPath))
  d.debug('secrets: ', JSON.stringify(secrets, null, 2))
  // from the plain values
  const plainValues = removeBlankAttributes(omit(values, secretsJsonPath)) as any
  const fieldsToOmit = ['cluster', 'policies', 'teamConfig', 'charts', '_derived']
  const secretSettings = omit(secrets, fieldsToOmit)
  const settings = omit(plainValues, fieldsToOmit)
  // and write to their files
  const promises: Promise<void>[] = []
  if (settings) promises.push(writeValuesToFile(`${env().ENV_DIR}/env/settings.yaml`, settings, overwrite))
  if (secretSettings)
    promises.push(writeValuesToFile(`${env().ENV_DIR}/env/secrets.settings.yaml`, secretSettings, overwrite))
  if (plainValues.cluster)
    promises.push(writeValuesToFile(`${env().ENV_DIR}/env/cluster.yaml`, { cluster: plainValues.cluster }, overwrite))
  if (plainValues.policies)
    promises.push(
      writeValuesToFile(`${env().ENV_DIR}/env/policies.yaml`, { policies: plainValues.policies }, overwrite),
    )

  const plainChartPromises = Object.keys((plainValues.charts || {}) as Record<string, any>).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: plainValues.charts[chart],
      },
    }
    return writeValuesToFile(`${env().ENV_DIR}/env/charts/${chart}.yaml`, valueObject, overwrite)
  })
  const secretChartPromises = Object.keys((secrets.charts || {}) as Record<string, any>).map((chart) => {
    const valueObject = {
      charts: {
        [chart]: secrets.charts[chart],
      },
    }
    return writeValuesToFile(`${env().ENV_DIR}/env/charts/secrets.${chart}.yaml`, valueObject, overwrite)
  })

  await Promise.all([...promises, ...secretChartPromises, ...plainChartPromises])

  d.info('All values were written to ENV_DIR')
}

/**
 * Takes values as input and generates secrets that don't exist yet.
 * Returns all generated secrets.
 */
export const generateSecrets = async (values: Record<string, any> = {}): Promise<Record<string, any>> => {
  const debug = terminal('generateSecrets')
  const leaf = 'x-secret'
  const localRefs = ['.dot.', '.v.', '.root.', '.o.']

  const schema = await getValuesSchema()

  debug.info('Extracting secrets')
  const secrets = extract(schema, leaf, (val: any) => {
    if (val.length > 0) {
      if (stringContainsSome(val, ...localRefs)) return val
      return `{{ ${val} }}`
    }
    return undefined
  })
  debug.debug('secrets: ', secrets)
  debug.info('First round of templating')
  const firstTemplateRound = (await gucci(secrets, {}, { asObject: true })) as Record<string, any>
  const firstTemplateFlattend = flattenObject(firstTemplateRound)

  debug.info('Parsing values for second round of templating')
  const expandedTemplates = Object.entries(firstTemplateFlattend)
    // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
    .filter(([_, v]) => stringContainsSome(v, ...localRefs))
    .map(([path, v]: string[]) => {
      /*
       * dotDot:
       *  Get full path, except last item, this allows to parse for siblings
       * dotV:
       *  Get .v by getting the second . after charts
       *  charts.hello.world
       *  ^----------^ Get this content (charts.hello)
       */
      const dotDot = path.slice(0, path.lastIndexOf('.'))
      const dotV = path.slice(0, path.indexOf('.', path.indexOf('charts.') + 'charts.'.length))

      const sDot = v.replaceAll('.dot.', `.${dotDot}.`)
      const vDot = sDot.replaceAll('.v.', `.${dotV}.`)
      const oDot = vDot.replaceAll('.o.', '.otomi.')
      const rootDot = oDot.replaceAll('.root.', '.')
      return [path, rootDot]
    })

  expandedTemplates.map(([k, v]) => {
    // Activate these templates and put them back into the object
    set(firstTemplateRound, k, `{{ ${v} }}`)
    return [k, v]
  })
  debug.debug('firstTemplateRound: ', firstTemplateRound)

  debug.info('Gather all values for the second round of templating')
  const gucciOutputAsTemplate = merge(cloneDeep(firstTemplateRound), values)
  debug.debug('gucciOutputAsTemplate: ', gucciOutputAsTemplate)

  debug.info('Second round of templating')
  const secondTemplateRound = (await gucci(firstTemplateRound, gucciOutputAsTemplate, {
    asObject: true,
  })) as Record<string, any>
  debug.debug('secondTemplateRound: ', secondTemplateRound)

  debug.info('Generated all secrets')
  // Only return values that have x-secrets prop and are now fully templated:
  const res = pick(secondTemplateRound, Object.keys(flattenObject(secrets)))
  debug.debug('generateSecrets result: ', res)
  return res
}
