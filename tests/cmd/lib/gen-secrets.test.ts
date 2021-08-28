import $RefParser from '@apidevtools/json-schema-ref-parser'
import { strictEqual } from 'assert'
import yaml from 'js-yaml'
import { has, omit } from 'lodash-es'
import { extractSecrets, generateSecrets } from '../../../src/cmd/lib/gen-secrets'
import { loadYaml } from '../../../src/common/utils'

describe('Automatic password generation tests', () => {
  it(`Generated secrets object contains all expected generated secrets`, async () => {
    const str = await generateSecrets()
    const generatedSecrets = yaml.load(str)
    strictEqual(has(generatedSecrets, 'charts.drone.adminToken'), true)
  })
  it('extractSecrets returns all secret pathes from schema', async () => {
    const schema = loadYaml('values-schema.yaml')
    const derefSchema = await $RefParser.dereference(schema)
    const cleanSchema = omit(derefSchema, ['definitions', 'properties.teamConfig'])
    const allSecrets = extractSecrets(cleanSchema).map((x) => x.Address)
    strictEqual(allSecrets.includes('charts.drone.adminTokend'), true)
  })
})
