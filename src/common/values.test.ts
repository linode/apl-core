import { cloneDeep, merge, set } from 'lodash'
import { env } from 'process'
import {
  generateSecrets,
  getTeamConfig,
  hasCorrespondingDecryptedFile,
  loadTeam,
  loadTeamFileToSpecToSpec,
  saveTeam,
} from 'src/common/values'
import stubs from 'src/test-stubs'
import { FileType } from './utils'

const { terminal } = stubs

describe('hasCorrespondingDecryptedFile', () => {
  it('should filter out encrypted files', () => {
    expect(hasCorrespondingDecryptedFile('test.yaml.dec', ['test.yaml.dec', 'test.yaml'])).toEqual(false)
    expect(hasCorrespondingDecryptedFile('test.yaml', ['test.yaml.dec', 'test.yaml'])).toEqual(true)
  })
})

describe('getTeamConfig', () => {
  it('should getTeamConfig', async () => {
    const deps = {
      loadTeam: jest.fn(),
      getTeamNames: jest.fn(),
    }

    deps.getTeamNames.mockResolvedValue(['t1', 't2'])
    deps.loadTeam.mockResolvedValueOnce({ id: 't1' }).mockResolvedValueOnce({ id: 't2' })

    const spec = await getTeamConfig(deps)
    const expectedSpec = { teamConfig: { t1: { id: 't1' }, t2: { id: 't2' } } }
    expect(spec).toEqual(expectedSpec)
  })
  it('should merge with existing spec an empty spec', async () => {
    const deps = {
      loadYaml: jest.fn().mockResolvedValue({ spec: { a: { b: '1' } } }),
    }
    const teamSpec = { settings: { a: { c: '2' } } }
    await loadTeamFileToSpecToSpec(teamSpec, 'env/teams/alpha/settings.yaml', deps)
    expect(teamSpec).toEqual({ settings: { a: { b: '1', c: '2' } } })
  })
  it('should push value to an array that aleeady exists an item', async () => {
    const deps = {
      loadYaml: jest.fn().mockResolvedValue({ spec: 2 }),
    }
    const teamSpec = { builds: [1] }
    await loadTeamFileToSpecToSpec(teamSpec, 'env/teams/alpha/builds.yaml', deps)
    expect(teamSpec).toEqual({ builds: [1, 2] })
  })
})

describe('loadTeamFileToSpec', () => {
  it('should load an empty spec', async () => {
    const deps = {
      loadYaml: jest.fn().mockResolvedValue({ spec: {} }),
    }
    const spec = {}
    await loadTeamFileToSpecToSpec(spec, 'env/teams/alpha/settings.yaml', deps)
    expect(spec).toEqual({ settings: {} })
  })
  it('should merge with existing spec an empty spec', async () => {
    const deps = {
      loadYaml: jest.fn().mockResolvedValue({ spec: { a: { b: '1' } } }),
    }
    const teamSpec = { settings: { a: { c: '2' } } }
    await loadTeamFileToSpecToSpec(teamSpec, 'env/teams/alpha/settings.yaml', deps)
    expect(teamSpec).toEqual({ settings: { a: { b: '1', c: '2' } } })
  })
  it('should push value to an array that aleeady exists an item', async () => {
    const deps = {
      loadYaml: jest.fn().mockResolvedValue({ spec: 2 }),
    }
    const teamSpec = { builds: [1] }
    await loadTeamFileToSpecToSpec(teamSpec, 'env/teams/alpha/builds.yaml', deps)
    expect(teamSpec).toEqual({ builds: [1, 2] })
  })
})

describe('loadTeam', () => {
  it('should not load anything if there are no files in team direcotry', async () => {
    const deps = {
      getFiles: jest.fn().mockResolvedValue([]),
      loadTeamFileToSpec: jest.fn().mockResolvedValue({ spec: {} }),
    }

    const spec = {}
    await loadTeam('alpha', deps)
    expect(spec).toEqual({})
  })
  it('should load team spec if there are files in team direcotry', async () => {
    const deps = {
      getFiles: jest.fn(),
      loadTeamFileToSpec: jest.fn(),
    }

    deps.getFiles
      .mockResolvedValueOnce(['builds', 'workloads'])
      .mockResolvedValueOnce(['settings.yaml', 'secrets.settings.yaml', 'secrets.settings.yaml.dec'])
      .mockResolvedValueOnce(['build1.yaml', 'build2.yaml'])
      .mockResolvedValueOnce(['workload1.yaml', 'workload2.yaml'])

    deps.loadTeamFileToSpec.mockResolvedValue(undefined)
    await loadTeam('alpha', deps)

    expect(deps.getFiles).toBeCalledTimes(4)
    expect(deps.getFiles).toHaveBeenNthCalledWith(1, `${env.ENV_DIR}/env/teams/alpha`, {
      skipHidden: true,
      fileType: FileType.Directory,
    })
    expect(deps.getFiles).toHaveBeenNthCalledWith(2, `${env.ENV_DIR}/env/teams/alpha`, {
      skipHidden: true,
      fileType: FileType.File,
    })
    expect(deps.getFiles).toHaveBeenNthCalledWith(3, `${env.ENV_DIR}/env/teams/alpha/builds`, {
      skipHidden: true,
      fileType: FileType.File,
    })
    expect(deps.getFiles).toHaveBeenNthCalledWith(4, `${env.ENV_DIR}/env/teams/alpha/workloads`, {
      skipHidden: true,
      fileType: FileType.File,
    })
    // Six times because secrets.settings.yaml should be eommited in favour of secrets.settings.yaml.dec
    expect(deps.loadTeamFileToSpec).toBeCalledTimes(6)
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      1,
      { builds: [], workloads: [] },
      `${env.ENV_DIR}/env/teams/alpha/builds/build1.yaml`,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      2,
      { builds: [], workloads: [] },
      `${env.ENV_DIR}/env/teams/alpha/builds/build2.yaml`,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      3,
      { builds: [], workloads: [] },
      `${env.ENV_DIR}/env/teams/alpha/workloads/workload1.yaml`,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      4,
      { builds: [], workloads: [] },
      `${env.ENV_DIR}/env/teams/alpha/workloads/workload2.yaml`,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      5,
      { builds: [], workloads: [] },
      `${env.ENV_DIR}/env/teams/alpha/settings.yaml`,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      6,
      { builds: [], workloads: [] },
      `${env.ENV_DIR}/env/teams/alpha/secrets.settings.yaml.dec`,
    )
  })
})

describe('saveTeam', () => {
  it('should not save a new empty team', async () => {
    const deps = {
      writeValuesToFile: jest.fn().mockResolvedValue(undefined),
    }
    // jest.spyOn(deps, 'writeValuesToFile')
    const dirPath = await saveTeam('test', {}, {}, false, deps)
    const expectedDirPath = `${env.ENV_DIR}/env/teams/test`
    expect(dirPath).toEqual(expectedDirPath)
    expect(deps.writeValuesToFile).toBeCalledTimes(0)
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

    const teamSpecSecrets = {
      settings: {},
    }
    const dirPath = await saveTeam('test', teamSpec, teamSpecSecrets, false, deps)
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
    settings: { secret1: 'abc' },
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
