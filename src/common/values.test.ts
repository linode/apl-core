import { cloneDeep, merge } from 'lodash'
import stubs from '../test-stubs'
import { generateSecrets } from './values'

const { terminal } = stubs

describe('generateSecrets', () => {
  const values = { one: 'val', secret: 'prop', charts: { yo: { di: { lo: 'loves you' } } } }
  const simpleTemplate = '"dummy"'
  const twoStageTemplate = '.dot.templatedSecret | upper'
  const schema = {
    properties: {
      one: {
        type: 'string',
      },
      secret: {
        type: 'string',
        'x-secret': '',
      },
      charts: {
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
                'x-secret': 'printf "%s!" .v.di.lo',
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
            'x-secret': twoStageTemplate,
          },
        },
      },
    },
  }
  const expected = {
    secret: 'prop',
    nested: { templatedSecret: 'dummy', twoStage: 'DUMMY' },
    charts: { yo: { mama: 'loves you!' } },
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
