import { cloneDeep, merge, set } from 'lodash'
import { generateSecrets, replaceSecretsWithPlaceholders } from 'src/common/values'
import stubs from 'src/test-stubs'

const { terminal } = stubs
describe('generateSecrets', () => {
  const values = { one: 'val', secret: 'prop', apps: { yo: { di: { lo: 'loves you' } } } }
  set(values, 'apps.harbor.registry.credentials.username', 'u')
  set(values, 'apps.harbor.registry.credentials.password', 'p')
  const simpleTemplate = 'dummy'
  const schema = {
    properties: {
      one: {
        type: 'string',
      },
      secret: {
        type: 'string',
        'x-secret': '',
      },
      apps: {
        properties: {
          yo: {
            properties: {
              di: {
                properties: {
                  lo: {
                    type: 'string',
                  },
                },
              },
              mama: {
                type: 'string',
                'x-secret': '{{ printf "%s!" "loves you" }}',
              },
            },
          },
        },
      },
      nested: {
        properties: {
          templatedSecret: {
            type: 'string',
            'x-secret': simpleTemplate,
          },
          twoStage: {
            type: 'string',
            'x-secret': '',
          },
        },
      },
    },
  }
  const expected = {
    secret: 'prop',
    nested: { templatedSecret: 'dummy' },
    apps: { yo: { mama: 'loves you!' } },
  }
  let deps
  beforeEach(() => {
    deps = {
      terminal,
      getValuesSchema: jest.fn().mockReturnValue(schema),
    }
  })
  it('should generate new secrets and return only secrets', async () => {
    const res = await generateSecrets(values, deps)
    expect(res).toEqual(expected)
  })
  it('should not overwrite old secrets', async () => {
    const valuesWithExisting = merge(cloneDeep(values), { nested: { twoStage: 'exists' } })

    const res = await generateSecrets(valuesWithExisting, deps)
    expect(res.nested.twoStage).toBe('exists')
  })
})

describe('replaceSecretsWithPlaceholders', () => {
  it('should replace secrets with sealed secret references using convention naming', () => {
    const input = {
      apps: {
        gitea: { adminPassword: 'real-pass', postgresqlPassword: 'db-pass', adminUsername: 'admin' },
        harbor: { adminPassword: 'harbor-pass' },
      },
    }
    const result = replaceSecretsWithPlaceholders(input)

    // All secrets now use sealed-secrets namespace with convention names
    expect(result.apps.gitea.adminPassword).toBe('sealed:sealed-secrets/gitea-secrets/adminPassword')
    expect(result.apps.gitea.postgresqlPassword).toBe('sealed:sealed-secrets/gitea-secrets/postgresqlPassword')
    expect(result.apps.gitea.adminUsername).toBe('sealed:sealed-secrets/gitea-secrets/adminUsername')
    expect(result.apps.harbor.adminPassword).toBe('sealed:sealed-secrets/harbor-secrets/adminPassword')
    // Original should not be modified
    expect(input.apps.gitea.adminPassword).toBe('real-pass')
  })

  it('should not replace already-placeholder values', () => {
    const input = {
      apps: { gitea: { adminPassword: 'sealed:sealed-secrets/gitea-secrets/adminPassword' } },
    }
    const result = replaceSecretsWithPlaceholders(input)
    expect(result.apps.gitea.adminPassword).toBe('sealed:sealed-secrets/gitea-secrets/adminPassword')
  })

  it('should not replace non-string values', () => {
    const input = {
      apps: { gitea: { adminPassword: 123 as any, postgresqlPassword: 'db-pass' } },
    }
    const result = replaceSecretsWithPlaceholders(input)
    expect(result.apps.gitea.adminPassword).toBe(123)
    expect(result.apps.gitea.postgresqlPassword).toBe('sealed:sealed-secrets/gitea-secrets/postgresqlPassword')
  })

  it('should handle values without matching paths', () => {
    const input = {
      apps: { grafana: { someConfig: 'not-a-secret' } },
    }
    const result = replaceSecretsWithPlaceholders(input)
    expect(result.apps.grafana.someConfig).toBe('not-a-secret')
  })
})
