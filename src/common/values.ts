import { existsSync, unlinkSync } from 'fs'
import { writeFile } from 'fs/promises'
import { dump } from 'js-yaml'
import { cloneDeep, get, isEmpty, isEqual, merge, omit, pick, set } from 'lodash'
import pkg from '../../package.json'
import { decrypt, encrypt } from './crypt'
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
import { HelmArguments } from './yargs'

const objectToYaml = (obj: Record<string, any>): string => {
  return isEmpty(obj) ? '' : dump(obj, { indent: 4 })
}

let otomiK8sVersion: string
/**
 * Find the cluster kubernetes version in the values
 * @returns String of the kubernetes version on the cluster
 */
export const getK8sVersion = (argv?: HelmArguments): string => {
  if (argv?.kubeVersion) return argv?.kubeVersion
  if (process.env.KUBE_VERSION_OVERRIDE) return process.env.KUBE_VERSION_OVERRIDE
  if (otomiK8sVersion) return otomiK8sVersion
  const clusterFile: any = loadYaml(`${env.ENV_DIR}/env/cluster.yaml`)
  otomiK8sVersion = clusterFile.cluster!.k8sVersion!
  return otomiK8sVersion
}

/**
 * Find what image tag is defined in configuration for otomi
 * @returns string
 */
export const getImageTag = async (): Promise<string> => {
  if (process.env.OTOMI_TAG) return process.env.OTOMI_TAG
  if (existsSync(`${env.ENV_DIR}/env/cluster.yaml`)) {
    const values = await hfValues()
    return values!.otomi!.version
  }
  return `v${pkg.version}`
}

let hasSops = false
/**
 * Writes new values to a file. Will keep the original values if `overwrite` is `false`.
 */
const writeValuesToFile = async (
  targetPath: string,
  inValues: Record<string, any> | undefined,
  overwrite = false,
): Promise<void> => {
  const d = terminal('common:values:writeValuesToFile')
  const isSecretsFile = targetPath.includes('/secrets.') && hasSops
  if (isEmpty(inValues) && isSecretsFile) {
    // get rid of empty secrets files as those are problematic
    if (existsSync(targetPath)) unlinkSync(targetPath)
    if (existsSync(`${targetPath}.dec`)) unlinkSync(`${targetPath}.dec`)
  }
  const values = cloneDeep(inValues) as Record<string, any>
  const newValues = removeBlankAttributes(values)
  d.debug('newValues: ', JSON.stringify(newValues, null, 2))
  const suffix = isSecretsFile ? '.dec' : ''
  if (!existsSync(targetPath) || overwrite) {
    // create the non-suffixed file for encryption to not skip this later on
    const notExists = !existsSync(targetPath)
    if (isSecretsFile && notExists) {
      await writeFile(targetPath, objectToYaml(newValues))
      await encrypt(targetPath)
      await decrypt(targetPath)
      return
    }
    await writeFile(targetPath + suffix, objectToYaml(newValues))
    return
  }
  const originalValues = loadYaml(targetPath + suffix, { noError: true }) ?? {}
  d.debug('originalValues: ', JSON.stringify(originalValues, null, 2))
  const mergeResult = merge(cloneDeep(originalValues), newValues)
  if (isEqual(originalValues, mergeResult)) {
    d.info(`No changes for ${targetPath}${suffix}, skipping...`)
    return
  }
  d.debug('mergeResult: ', JSON.stringify(mergeResult, null, 2))
  await writeFile(targetPath + suffix, objectToYaml(mergeResult))
  d.info(`Values were written to ${targetPath}${suffix}`)
}

/**
 * Writes new values to the repo. Will keep the original values if `overwrite` is `false`.
 */
export const writeValues = async (values: Record<string, any>, overwrite = false): Promise<void> => {
  const d = terminal('common:values:writeValues')
  d.debug('Writing values: ', values)
  hasSops = existsSync(`${env.ENV_DIR}/.sops.yaml`)
  // We relocated teamConfig.teams to teamConfig, so one time we might have to fall back to our previous location
  // TODO:[teamConfig] deprecate this fallback sometime in the future
  const teams = Object.keys((values.teamConfig?.teams ?? values.teamConfig) || {}).filter((i) => i !== 'teams')
  // creating secret files
  const schema = await getValuesSchema()
  const leaf = 'x-secret'
  const schemaSecrets = extract(schema, leaf, (val: any) => (val.length > 0 ? `{{ ${val} }}` : val))
  d.debug('schemaSecrets: ', JSON.stringify(schemaSecrets, null, 2))
  // Get all JSON paths for secrets, without the .x-secret appended
  const secretPaths = Object.keys(flattenObject(schemaSecrets)).map((v) => v.replaceAll(`.${leaf}`, ''))
  // now blow up the teamConfig.$team prop as it is determined by a pattern
  const cleanSecretPaths: string[] = []
  const teamProp = `teamConfig.patternProperties.${Object.keys(schema.properties.teamConfig.patternProperties)[0]}`
  secretPaths.forEach((p) => {
    teams.forEach((team: string) => {
      if (p.indexOf(teamProp) === 0) cleanSecretPaths.push(p.replace(teamProp, `teamConfig.${team}`))
    })
    if (p.indexOf(teamProp) === -1 && !cleanSecretPaths.includes(p)) cleanSecretPaths.push(p)
  })
  d.debug('cleanSecretPaths: ', cleanSecretPaths)
  // separate out the secrets
  const secrets = removeBlankAttributes(pick(values, cleanSecretPaths))
  d.debug('secrets: ', JSON.stringify(secrets, null, 2))
  // from the plain values
  const plainValues = omit(values, cleanSecretPaths) as any
  const fieldsToOmit = ['cluster', 'policies', 'teamConfig', 'apps', '_derived']
  const secretSettings = omit(secrets, fieldsToOmit)
  const settings = omit(plainValues, fieldsToOmit)
  // and write to their files
  const promises: Promise<void>[] = []
  if (settings) promises.push(writeValuesToFile(`${env.ENV_DIR}/env/settings.yaml`, settings, overwrite))
  if (secretSettings || overwrite)
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/secrets.settings.yaml`, secretSettings, overwrite))
  if (plainValues.cluster || overwrite)
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/cluster.yaml`, { cluster: plainValues.cluster }, overwrite))
  if (plainValues.policies || overwrite)
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/policies.yaml`, { policies: plainValues.policies }, overwrite))
  if (plainValues.teamConfig || overwrite) {
    const types = ['apps', 'jobs', 'secrets', 'services']
    const fileMap = { secrets: 'external-secrets' }
    if (!teams.includes('admin')) teams.push('admin')
    const teamConfig = plainValues.teamConfig ? cloneDeep(plainValues.teamConfig) : {}
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    teams.forEach(async (team) => {
      const teamPromises: Promise<void>[] = []
      types.forEach((type): void => {
        const fileType = fileMap[type] || type
        teamPromises.push(
          writeValuesToFile(
            `${env.ENV_DIR}/env/teams/${fileType}.${team}.yaml`,
            { teamConfig: { [team]: { [type]: get(plainValues, `teamConfig.${team}.${type}`, {}) } } },
            overwrite,
          ),
        )
        // keep the teamConfig but omit the leafs that were just stored in their own teams/* file
        if (teamConfig[team] && teamConfig[team][type]) delete teamConfig[team][type]
      })
      await Promise.all(teamPromises)
    })
    promises.push(writeValuesToFile(`${env.ENV_DIR}/env/teams.yaml`, { teamConfig }, overwrite))
  }
  if (secrets.teamConfig || overwrite) {
    promises.push(
      writeValuesToFile(
        `${env.ENV_DIR}/env/secrets.teams.yaml`,
        secrets.teamConfig ? { teamConfig: secrets.teamConfig } : undefined,
        overwrite,
      ),
    )
  }
  await Promise.all(promises)

  const plainValuesPromises = Object.keys((plainValues.apps || {}) as Record<string, any>).map((app) => {
    const valueObject = {
      apps: {
        [app]: plainValues.apps[app],
      },
    }
    return writeValuesToFile(`${env.ENV_DIR}/env/apps/${app}.yaml`, valueObject, overwrite)
  })
  await Promise.all(plainValuesPromises)

  const secretValuesPromises = Object.keys((secrets.apps || {}) as Record<string, any>).map((app) => {
    const valueObject = {
      apps: {
        [app]: secrets.apps[app],
      },
    }
    return writeValuesToFile(`${env.ENV_DIR}/env/apps/secrets.${app}.yaml`, valueObject, overwrite)
  })
  await Promise.all(secretValuesPromises)

  d.info('All values were written to ENV_DIR')
}

/**
 * Takes values as input and generates secrets that don't exist yet.
 * Returns all generated secrets.
 */
export const generateSecrets = async (
  values: Record<string, any> = {},
  deps = {
    terminal,
    getValuesSchema,
  },
): Promise<Record<string, any>> => {
  const d = deps.terminal('common:values:generateSecrets')
  const leaf = 'x-secret'
  const localRefs = ['.dot.', '.v.', '.root.', '.o.']

  const schema = await deps.getValuesSchema()

  d.info('Extracting secrets')
  const secrets = extract(schema, leaf, (val: any) => {
    if (val.length > 0) {
      if (stringContainsSome(val, ...localRefs)) return val
      return `{{ ${val} }}`
    }
    return undefined
  })
  d.debug('secrets: ', secrets)
  d.info('First round of templating')
  const firstTemplateRound = (await gucci(secrets, {})) as Record<string, any>
  const firstTemplateFlattend = flattenObject(firstTemplateRound)

  d.info('Parsing values for second round of templating')
  const expandedTemplates = Object.entries(firstTemplateFlattend)
    // eslint-disable-next-line no-unused-vars,@typescript-eslint/no-unused-vars
    .filter(([_, v]) => stringContainsSome(v, ...localRefs))
    .map(([path, v]: string[]) => {
      /*
       * dotDot:
       *  Get full path, except last item, this allows to parse for siblings
       * dotV:
       *  Get .v by getting the second . after apps
       *  apps.hello.world
       *  ^----------^ Get this content (apps.hello)
       */
      const dotDot = path.slice(0, path.lastIndexOf('.'))
      const dotV = path.slice(0, path.indexOf('.', path.indexOf('apps.') + 'apps.'.length))

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
  d.debug('firstTemplateRound: ', firstTemplateRound)

  d.info('Gather all values for the second round of templating')
  const gucciOutputAsTemplate = merge(cloneDeep(firstTemplateRound), cloneDeep(values))
  d.debug('gucciOutputAsTemplate: ', gucciOutputAsTemplate)

  d.info('Second round of templating')
  const secondTemplateRound = (await gucci(firstTemplateRound, gucciOutputAsTemplate)) as Record<string, any>
  d.debug('secondTemplateRound: ', secondTemplateRound)

  d.info('Generated all secrets')
  // Only return values that have x-secrets prop and are now fully templated:
  const allSecrets = extract(schema, leaf)
  const res = pick(merge(secondTemplateRound, cloneDeep(values)), Object.keys(flattenObject(allSecrets)))
  d.debug('generateSecrets result: ', res)
  return res
}
