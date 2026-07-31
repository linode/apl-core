import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { join } from 'path'

const schema = load(readFileSync(join(__dirname, '../../values-schema.yaml'), 'utf8')) as Record<string, any>

type RequiredSecret = { path: string; generator: string }

// Structural keywords are dropped from the reported path so it reads like a values path.
const structuralKeys = ['properties', 'definitions', 'patternProperties', 'items', 'oneOf', 'anyOf', 'allOf']

const collectRequiredGeneratedSecrets = (node: any, path = ''): RequiredSecret[] => {
  if (!node || typeof node !== 'object') return []
  const found: RequiredSecret[] = []
  if (Array.isArray(node.required) && node.properties) {
    node.required.forEach((name: string) => {
      const prop = node.properties[name]
      const generator = prop?.['x-secret']
      if (typeof generator === 'string' && generator.length > 0) {
        found.push({ path: [path, name].filter(Boolean).join('.'), generator })
      }
    })
  }
  Object.entries(node).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') return
    const childPath =
      structuralKeys.includes(key) || !Number.isNaN(Number(key)) ? path : [path, key].filter(Boolean).join('.')
    found.push(...collectRequiredGeneratedSecrets(value, childPath))
  })
  return found
}

describe('values-schema x-secret fields', () => {
  it('should not mark generator-backed secrets as required', () => {
    // A secret the platform generates for itself (`x-secret: '{{ randAlphaNum 20 }}'`) must not also be
    // `required`. The generator only runs inside the apl-operator bootstrap, so any install path that
    // validates values-schema before that — `helm install apl/apl` included — hard-fails on a field the
    // platform was about to fill in. Operator-supplied secrets (`x-secret: ''`) may stay required.
    const offenders = collectRequiredGeneratedSecrets(schema)

    expect(offenders).toEqual([])
  })
})
