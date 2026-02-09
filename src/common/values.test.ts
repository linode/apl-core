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
  it('should replace gitea secrets with sealed secret references', () => {
    const input = {
      apps: {
        gitea: { adminPassword: 'real-pass', postgresqlPassword: 'db-pass', adminUsername: 'admin' },
        harbor: { adminPassword: 'harbor-pass' },
      },
    }
    const result = replaceSecretsWithPlaceholders(input)

    expect(result.apps.gitea.adminPassword).toBe('sealed:gitea/gitea-admin-secret/password')
    expect(result.apps.gitea.postgresqlPassword).toBe('sealed:gitea/gitea-db-secret/password')
    expect(result.apps.gitea.adminUsername).toBe('sealed:gitea/gitea-admin-secret/username')
    expect(result.apps.harbor.adminPassword).toBe('harbor-pass')
    // Original should not be modified
    expect(input.apps.gitea.adminPassword).toBe('real-pass')
  })

  it('should not replace already-placeholder values', () => {
    const input = {
      apps: { gitea: { adminPassword: 'sealed:gitea/gitea-admin-secret/password' } },
    }
    const result = replaceSecretsWithPlaceholders(input)
    expect(result.apps.gitea.adminPassword).toBe('sealed:gitea/gitea-admin-secret/password')
  })

  it('should not replace non-string values', () => {
    const input = {
      apps: { gitea: { adminPassword: 123 as any, postgresqlPassword: 'db-pass' } },
    }
    const result = replaceSecretsWithPlaceholders(input)
    expect(result.apps.gitea.adminPassword).toBe(123)
    expect(result.apps.gitea.postgresqlPassword).toBe('sealed:gitea/gitea-db-secret/password')
  })

  it('should handle values without matching paths', () => {
    const input = {
      apps: { harbor: { adminPassword: 'harbor-pass' } },
    }
    const result = replaceSecretsWithPlaceholders(input)
    expect(result.apps.harbor.adminPassword).toBe('harbor-pass')
  })
})
