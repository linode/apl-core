import $RefParser from '@apidevtools/json-schema-ref-parser'
import { dump } from 'js-yaml'
import { omit, set } from 'lodash-es'
import { gucci, loadYaml } from '../../common/utils'

export interface secretPath {
  Address: string
  Generator: string
}
export const extractSecrets = (schema: any, parentAddress?: string): Array<secretPath> => {
  const schemaKeywords = ['properties', 'anyOf', 'allOf', 'oneOf']
  return Object.keys(schema)
    .flatMap((key) => {
      const childObj = schema[key]
      if (typeof childObj !== 'object') return false
      if ('x-secret' in childObj) {
        const adr = parentAddress ? `${parentAddress}.${key}` : key
        const generator = childObj['x-secret']
        return { Address: adr, Generator: generator }
      }
      let address
      if (parentAddress === undefined) {
        address = schemaKeywords.includes(key) ? undefined : key
      } else if (schemaKeywords.includes(key) || !Number.isNaN(Number(key))) address = parentAddress
      else address = `${parentAddress}.${key}`
      return extractSecrets(childObj, address)
    })
    .filter(Boolean) as Array<secretPath>
}

export const generateSecrets = async (): Promise<string> => {
  const schema = loadYaml('values-schema.yaml')
  const derefSchema = await $RefParser.dereference(schema)
  const cleanSchema = omit(derefSchema, ['definitions', 'properties.teamConfig'])
  const secretGenerators = extractSecrets(cleanSchema)
  console.debug(secretGenerators)
  const obj = {}
  secretGenerators
    .filter((sec) => sec.Generator !== '')
    .forEach((sec) => set(obj, sec.Address, `{{ ${sec.Generator} }}`))

  console.debug(dump(obj))
  const allSecrets = await gucci(dump(obj), {})
  console.info(allSecrets)

  return allSecrets!

  /*
    Steps:
        1. Extract values from schema var based on secrets Key => if not empty: (key: {{ value }}) else: skip
        2. Write secretsJsonPath as yaml to tmp file
        3. Run gucci on tmp file
        4. Merge output with values
  */
}
