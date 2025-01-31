import { env } from 'process'
import {
  getTeamConfig,
  hasCorrespondingDecryptedFile,
  loadAsArrayPathFilters,
  loadTeam,
  loadTeamFileToSpec,
  saveTeam,
} from 'src/common/repo'
import stubs from 'src/test-stubs'

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
})

describe('loadTeamFileToSpec', () => {
  it('should load an empty spec', async () => {
    const deps = {
      loadYaml: jest.fn().mockResolvedValue({ spec: {} }),
    }
    const spec = {}
    await loadTeamFileToSpec(spec, 'env/teams/alpha/settings.yaml', loadAsArrayPathFilters, deps)
    expect(spec).toEqual({ settings: {} })
  })

  it('should merge with existing spec an empty spec', async () => {
    const deps = {
      loadYaml: jest.fn().mockResolvedValue({ spec: { a: { b: '1' } } }),
    }
    const teamSpec = { settings: { a: { c: '2' } } }
    await loadTeamFileToSpec(teamSpec, 'env/teams/alpha/settings.yaml', loadAsArrayPathFilters, deps)
    expect(teamSpec).toEqual({ settings: { a: { b: '1', c: '2' } } })
  })
  it('should push value to an array that already exists an item', async () => {
    const deps = {
      loadYaml: jest.fn().mockResolvedValue({ spec: 2 }),
    }
    const teamSpec = { builds: [1] }
    await loadTeamFileToSpec(teamSpec, 'env/teams/alpha/builds/b2.yaml', loadAsArrayPathFilters, deps)
    expect(teamSpec).toEqual({ builds: [1, 2] })
  })

  it('should load secret files to existing spec', async () => {
    const deps = {
      loadYaml: jest.fn().mockResolvedValue({ spec: { password: 2 } }),
    }
    const teamSpec = { settings: { id: 1 } }
    await loadTeamFileToSpec(teamSpec, 'env/teams/alpha/secrets.settings.yaml.dec', loadAsArrayPathFilters, deps)
    expect(teamSpec).toEqual({ settings: { id: 1, password: 2 } })
  })
})

describe('loadTeam', () => {
  it('should not load anything if there are no files in team direcotry', async () => {
    const paths = []
    const deps = {
      loadTeamFileToSpec: jest.fn().mockResolvedValue({ spec: {} }),
      globSync: jest.fn().mockReturnValue(paths),
    }

    const spec = {}
    await loadTeam('alpha', deps)
    expect(spec).toEqual({})
  })
  it('should load team spec if there are files in team direcotry', async () => {
    const paths = [
      `${env.ENV_DIR}/env/teams/alpha/builds/build1.yaml`,
      `${env.ENV_DIR}/env/teams/alpha/builds/build2.yaml`,
      `${env.ENV_DIR}/env/teams/alpha/workloads/workload1.yaml`,
      `${env.ENV_DIR}/env/teams/alpha/workloads/workload2.yaml`,
      `${env.ENV_DIR}/env/teams/alpha/settings.yaml`,
      `${env.ENV_DIR}/env/teams/alpha/secrets.settings.yaml`,
      `${env.ENV_DIR}/env/teams/alpha/secrets.settings.yaml.dec`,
    ]
    const deps = {
      loadTeamFileToSpec: jest.fn().mockResolvedValue({ spec: {} }),
      globSync: jest.fn().mockReturnValue(paths),
    }

    deps.loadTeamFileToSpec.mockResolvedValue(undefined)
    await loadTeam('alpha', deps)

    // Six times because secrets.settings.yaml should be eommited in favour of secrets.settings.yaml.dec
    expect(deps.loadTeamFileToSpec).toBeCalledTimes(6)
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      1,
      {},
      `${env.ENV_DIR}/env/teams/alpha/builds/build1.yaml`,
      loadAsArrayPathFilters,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      2,
      {},
      `${env.ENV_DIR}/env/teams/alpha/builds/build2.yaml`,
      loadAsArrayPathFilters,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      3,
      {},
      `${env.ENV_DIR}/env/teams/alpha/workloads/workload1.yaml`,
      loadAsArrayPathFilters,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      4,
      {},
      `${env.ENV_DIR}/env/teams/alpha/workloads/workload2.yaml`,
      loadAsArrayPathFilters,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      5,
      {},
      `${env.ENV_DIR}/env/teams/alpha/settings.yaml`,
      loadAsArrayPathFilters,
    )
    expect(deps.loadTeamFileToSpec).toHaveBeenNthCalledWith(
      6,
      {},
      `${env.ENV_DIR}/env/teams/alpha/secrets.settings.yaml.dec`,
      loadAsArrayPathFilters,
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
