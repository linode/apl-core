import $RefParser from '@apidevtools/json-schema-ref-parser'
import { dump } from 'js-yaml'
import { omit, set } from 'lodash-es'
import { gucci, loadYaml } from '../../common/utils'

export const extractSecrets = (schema: any, parentAddress?: string): Array<string> => {
  const schemaKeywords = ['properties', 'anyOf', 'allOf', 'oneOf']

  return Object.keys(schema)
    .flatMap((key) => {
      const childObj = schema[key]
      if (typeof childObj !== 'object') return false
      if ('x-secret' in childObj) return parentAddress ? `${parentAddress}.${key}` : key
      let address
      if (parentAddress === undefined) {
        address = schemaKeywords.includes(key) ? undefined : key
      } else if (schemaKeywords.includes(key) || !Number.isNaN(Number(key))) address = parentAddress
      else address = `${parentAddress}.${key}`
      return extractSecrets(childObj, address)
    })
    .filter(Boolean)
    .map((s: string) => s.replace(/^properties\./, ''))
}

export const extractSecretGenerators = (schema: any): Array<string> => {
  return Object.keys(schema)
    .flatMap((key) => {
      const childObj = schema[key]
      if (typeof childObj !== 'object') return false
      if ('x-secret' in childObj) return childObj['x-secret'] !== '' ? childObj['x-secret'] : 'empty'
      return extractSecretGenerators(childObj)
    })
    .filter(Boolean) as Array<string>
}

export const generateSecrets = async (): Promise<string> => {
  const schema = loadYaml('values-schema.yaml')
  const derefSchema = await $RefParser.dereference(schema)
  const cleanSchema = omit(derefSchema, ['definitions', 'properties.teamConfig']) // FIXME: lets fix the team part later
  const secretGenerators = extractSecretGenerators(cleanSchema)
  const secretsValuesPath = extractSecrets(cleanSchema)
  console.debug(secretGenerators)
  console.debug(secretsValuesPath)

  const obj = {}

  secretsValuesPath.forEach((path, i) => {
    if (secretGenerators[i] !== 'empty') set(obj, path, `{{ ${secretGenerators[i]} }}`)
  })

  console.debug(dump(obj))
  const allSecrets = await gucci(dump(obj), {})

  console.info(allSecrets)

  return allSecrets

  /*
    Steps:
        1. Extract values from schema var based on secrets Key => if not empty: (key: {{ value }}) else: skip
        2. Write secretsJsonPath as yaml to tmp file
        3. Run gucci on tmp file
        4. Merge output with values
  */
}
