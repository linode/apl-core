import { cloneDeep, merge, set } from 'lodash'
import { env } from 'process'
import { generateSecrets, saveTeam } from 'src/common/values'
import stubs from 'src/test-stubs'

const { terminal } = stubs

describe('saveTeam', () => {
  it('should save a new empty team', async () => {
    const deps = {
      writeValuesToFile: jest.fn().mockResolvedValue(undefined),
    }
    // jest.spyOn(deps, 'writeValuesToFile')
    const dirPath = await saveTeam('test', {}, {}, false, deps)
    const expectedDirPath = `${env.ENV_DIR}/env/teams/test`
    expect(dirPath).toEqual(expectedDirPath)
    expect(deps.writeValuesToFile).toBeCalledTimes(1)
    expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
      1,
      `${expectedDirPath}/secrets.settings.yaml`,
      { spec: {} },
      false,
    )
  })
  it('should save a new empty team with empty resources', async () => {
    const deps = {
      writeValuesToFile: jest.fn().mockResolvedValue(undefined),
    }
    // jest.spyOn(deps, 'writeValuesToFile')
    const teamSpec = {
      apps: {},
      backups: [],
      policies: {},
      secrets: [],
      sealedsecrets: [],
      services: [],
      workloads: [],
      settings: {},
    }

    const dirPath = await saveTeam('test', teamSpec, {}, false, deps)
    const expectedDirPath = `${env.ENV_DIR}/env/teams/test`
    expect(dirPath).toEqual(expectedDirPath)
    expect(deps.writeValuesToFile).toBeCalledTimes(4)
    expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(1, `${expectedDirPath}/apps.yaml`, { spec: {} }, false)
    expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(2, `${expectedDirPath}/policies.yaml`, { spec: {} }, false)
    expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(3, `${expectedDirPath}/settings.yaml`, { spec: {} }, false)
    expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
      4,
      `${expectedDirPath}/secrets.settings.yaml`,
      { spec: {} },
      false,
    )
  })
})

it('should save a team with resources', async () => {
  const deps = {
    writeValuesToFile: jest.fn().mockResolvedValue(undefined),
  }
  // jest.spyOn(deps, 'writeValuesToFile')
  const teamSpec = {
    apps: {},
    policies: { policy1: {} },
    sealedsecrets: [{ name: 'ss1' }],
    services: [{ name: 'svc1' }, { name: 'svc2' }],
    settings: { param: 1 },
    workloads: [{ name: 'w1' }, { name: 'w2' }],
  }
  const teamSecretSpec = {
    secret1: 'abc',
  }

  const dirPath = await saveTeam('test', teamSpec, teamSecretSpec, false, deps)
  const expectedDirPath = `${env.ENV_DIR}/env/teams/test`
  expect(dirPath).toEqual(expectedDirPath)
  expect(deps.writeValuesToFile).toBeCalledTimes(9)
  expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(1, `${expectedDirPath}/apps.yaml`, { spec: {} }, false)
  expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
    2,
    `${expectedDirPath}/policies.yaml`,
    { spec: { policy1: {} } },
    false,
  )
  expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
    3,
    `${expectedDirPath}/sealedsecrets/ss1.yaml`,
    { spec: { name: 'ss1' } },
    false,
  )
  expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
    4,
    `${expectedDirPath}/services/svc1.yaml`,
    { spec: { name: 'svc1' } },
    false,
  )
  expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
    5,
    `${expectedDirPath}/services/svc2.yaml`,
    { spec: { name: 'svc2' } },
    false,
  )
  expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
    6,
    `${expectedDirPath}/settings.yaml`,
    { spec: { param: 1 } },
    false,
  )
  expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
    7,
    `${expectedDirPath}/workloads/w1.yaml`,
    { spec: { name: 'w1' } },
    false,
  )
  expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
    8,
    `${expectedDirPath}/workloads/w2.yaml`,
    { spec: { name: 'w2' } },
    false,
  )
  expect(deps.writeValuesToFile).toHaveBeenNthCalledWith(
    9,
    `${expectedDirPath}/secrets.settings.yaml`,
    { spec: { secret1: 'abc' } },
    false,
  )
})

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
