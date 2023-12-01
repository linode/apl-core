import { cloneDeep, merge, set } from 'lodash'
import { generateSecrets } from 'src/common/values'
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await generateSecrets(values, deps)
    expect(res).toEqual(expected)
  })
  it('should not overwrite old secrets', async () => {
    const valuesWithExisting = merge(cloneDeep(values), { nested: { twoStage: 'exists' } })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const res = await generateSecrets(valuesWithExisting, deps)
    expect(res.nested.twoStage).toBe('exists')
  })
})
