import { globSync } from 'glob'
import { applyChanges, Changes, filterChanges, getBuildName, policiesMigration } from 'src/cmd/migrate'
import { terminal } from '../common/debug'
import { env } from '../common/envalid'
import { getFileMap } from '../common/repo'

// Mock external dependencies at the top level - BEFORE imports
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'my-fixed-uuid'),
}))

jest.mock('../common/k8s')
jest.mock('../common/values')
jest.mock('../common/yargs')
jest.mock('../common/utils')
jest.mock('zx')
jest.mock('@linode/kubeseal-encrypt')
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}))

describe('Upgrading values', () => {
  const oldVersion = 1
  const mockValues = {
    teamConfig: {
      teamA: {
        services: [
          { name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }], type: 'cluster' },
          { name: 'svc2', prop: 'replaceMe', di: [{ ok: 'replaceMeNot' }], type: 'public' },
        ],
      },
    },
    versions: { specVersion: oldVersion },
    some: { json: { path: 'bla' }, k8sVersion: '1.18' },
  }
  const mockChanges: Changes = [
    {
      version: 1,
      // mutations: [{ 'some.version': 'printf "v%s" .prev' }],
    },
    {
      version: 2,
      deletions: ['some.bla.path'],
      relocations: [{ 'some.json': 'some.bla' }],
    },
    {
      version: 3,
      mutations: [
        // { 'some.k8sVersion': 'printf "v%s" .prev' },
        { 'teamConfig.{team}.services[].prop': 'replaced' },
        // { 'teamConfig.{team}.services[].bla[].ok': 'print .prev "ee"' },
      ],
      renamings: [{ 'somefile.yaml': 'newloc.yaml' }],
    },
    {
      version: 4,
      deletions: [
        // { 'some.k8sVersion': 'printf "v%s" .prev' },
        'teamConfig.{team}.services[].type',
        // { 'teamConfig.{team}.services[].bla[].ok': 'print .prev "ee"' },
      ],
    },
  ]

  describe('Filter changes', () => {
    it('should only select changes whose version >= current version', () => {
      expect(filterChanges(oldVersion, mockChanges)).toEqual(mockChanges.slice(1, 4))
    })
  })
  describe('Apply changes to values', () => {
    const deps = {
      cd: jest.fn(),
      rename: jest.fn(),
      hfValues: jest.fn().mockReturnValue(mockValues),
      terminal,
      writeValues: jest.fn(),
    }
    it('should apply changes to values', async () => {
      await applyChanges(mockChanges.slice(1), false, deps)
      expect(deps.writeValues).toHaveBeenCalledWith(
        {
          teamConfig: {
            teamA: {
              services: [
                { name: 'svc1', prop: 'replaced', bla: [{ ok: 'replaceMe' }] },
                { name: 'svc2', prop: 'replaced', di: [{ ok: 'replaceMeNot' }] },
              ],
            },
          },
          some: { bla: {}, k8sVersion: '1.18' },
          versions: { specVersion: 4 },
        },
        true,
      )
      expect(deps.rename).toHaveBeenCalledWith(`somefile.yaml`, `newloc.yaml`, false)
    })
  })
})

describe('Values migrations', () => {
  let values: any = undefined
  let valuesChanges: any = undefined
  let deps: any = undefined
  beforeEach(() => {
    values = {
      teamConfig: {
        teamA: {
          services: [{ name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] }],
          monitoringStack: true,
        },
        teamB: {
          services: [{ name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] }],
          monitoringStack: false,
        },
      },
      versions: { specVersion: 1 },
    }

    valuesChanges = {
      version: 2,
      deletions: ['teamConfig.{team}.monitoringStack'],
      additions: [
        { 'teamConfig.{team}.managedMonitoring.grafana': 'true' },
        { 'teamConfig.{team}.managedMonitoring.prometheus': 'true' },
        { 'teamConfig.{team}.managedMonitoring.alertmanager': 'true' },
      ],
    }
    deps = {
      cd: jest.fn(),
      rename: jest.fn(),
      hfValues: jest.fn().mockReturnValue(values),
      terminal,
      writeValues: jest.fn(),
    }
  })
  it('should apply changes to team values', async () => {
    await applyChanges([valuesChanges], false, deps)
    expect(deps.writeValues).toHaveBeenCalledWith(
      {
        teamConfig: {
          teamA: {
            services: [{ name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] }],
            managedMonitoring: {
              grafana: 'true',
              prometheus: 'true',
              alertmanager: 'true',
            },
          },
          teamB: {
            services: [{ name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] }],
            managedMonitoring: {
              grafana: 'true',
              prometheus: 'true',
              alertmanager: 'true',
            },
          },
        },
        versions: { specVersion: 2 },
      },
      true,
    )
  })
})

describe('Network policies migrations', () => {
  const getMockValues = () => ({
    versions: { specVersion: 1 },
    teamConfig: {
      teamA: {
        selfService: { service: ['ingress', 'networkPolicy'] },
        services: [
          { id: 'my-fixed-uuid', name: 'svc1', networkPolicy: { ingressPrivate: { mode: 'AllowAll' } } },
          {
            id: 'my-fixed-uuid',
            name: 'svc2',
            networkPolicy: {
              ingressPrivate: {
                mode: 'AllowOnly',
              },
            },
          },
          {
            id: 'my-fixed-uuid',
            name: 'svc3',
            networkPolicy: {
              ingressPrivate: {
                mode: 'DenyAll',
              },
            },
          },
          { id: 'my-fixed-uuid', name: 'svc4' },
          { id: 'my-fixed-uuid', name: 'svc5', networkPolicy: { ingressPrivate: { mode: 'AllowAll' } } },
          {
            id: 'my-fixed-uuid',
            name: 'svc6',
            networkPolicy: {
              ingressPrivate: {
                mode: 'AllowOnly',
                allow: [
                  {
                    team: 'team1',
                  },
                  {
                    team: 'team2',
                    service: 'svc6',
                  },
                ],
              },
            },
          },
        ],
      },
      teamB: {
        services: [
          {
            id: 'my-fixed-uuid',
            name: 'svc7',
            networkPolicy: {
              ingressPrivate: {
                mode: 'AllowOnly',
                allow: [
                  {
                    team: 'team1',
                  },
                  {
                    team: 'team2',
                    service: 'svc7',
                  },
                ],
              },
              egressPublic: [
                {
                  domain: 'domain1.com',
                  ports: [
                    {
                      number: 8443,
                      protocol: 'TCP',
                    },
                  ],
                },
                {
                  domain: 'domain2.com',
                  ports: [
                    {
                      number: 443,
                      protocol: 'HTTPS',
                    },
                  ],
                },
                {
                  domain: '185.199.110.153',
                  ports: [
                    {
                      number: 443,
                      protocol: 'TCP',
                    },
                  ],
                },
                {
                  domain: 'ae::1',
                  ports: [
                    {
                      number: 443,
                      protocol: 'TCP',
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    },
  })

  const getExpectedValues = () => ({
    versions: { specVersion: 2 },
    teamConfig: {
      teamA: {
        selfService: { service: ['ingress'] },
        services: [
          { id: 'my-fixed-uuid', name: 'svc1' },
          { id: 'my-fixed-uuid', name: 'svc2' },
          { id: 'my-fixed-uuid', name: 'svc3' },
          { id: 'my-fixed-uuid', name: 'svc4' },
          { id: 'my-fixed-uuid', name: 'svc5' },
          { id: 'my-fixed-uuid', name: 'svc6' },
        ],
        netpols: [
          {
            id: 'my-fixed-uuid',
            name: 'svc1',
            ruleType: {
              type: 'ingress',
              ingress: { mode: 'AllowAll', toLabelName: 'otomi.io/app', toLabelValue: 'svc1' },
            },
          },
          {
            id: 'my-fixed-uuid',
            name: 'svc2',
            ruleType: {
              type: 'ingress',
              ingress: { mode: 'AllowOnly', toLabelName: 'otomi.io/app', toLabelValue: 'svc2' },
            },
          },
          {
            id: 'my-fixed-uuid',
            name: 'svc5',
            ruleType: {
              type: 'ingress',
              ingress: { mode: 'AllowAll', toLabelName: 'otomi.io/app', toLabelValue: 'svc5' },
            },
          },
          {
            id: 'my-fixed-uuid',
            name: 'svc6',
            ruleType: {
              type: 'ingress',
              ingress: {
                mode: 'AllowOnly',
                allow: [
                  { fromNamespace: 'team-team1' },
                  { fromNamespace: 'team-team2', fromLabelName: 'otomi.io/app', fromLabelValue: 'svc6' },
                ],
                toLabelName: 'otomi.io/app',
                toLabelValue: 'svc6',
              },
            },
          },
        ],
      },
      teamB: {
        services: [{ id: 'my-fixed-uuid', name: 'svc7' }],
        netpols: [
          {
            id: 'my-fixed-uuid',
            name: 'svc7',
            ruleType: {
              type: 'ingress',
              ingress: {
                mode: 'AllowOnly',
                allow: [
                  {
                    fromNamespace: 'team-team1',
                  },
                  {
                    fromNamespace: 'team-team2',
                    fromLabelName: 'otomi.io/app',
                    fromLabelValue: 'svc7',
                  },
                ],
                toLabelName: 'otomi.io/app',
                toLabelValue: 'svc7',
              },
            },
          },
          {
            id: 'my-fixed-uuid',
            name: 'domain1-com',
            ruleType: {
              type: 'egress',
              egress: {
                domain: 'domain1.com',
                ports: [
                  {
                    number: 8443,
                    protocol: 'TCP',
                  },
                ],
              },
            },
          },
          {
            id: 'my-fixed-uuid',
            name: 'domain2-com',
            ruleType: {
              type: 'egress',
              egress: {
                domain: 'domain2.com',
                ports: [
                  {
                    number: 443,
                    protocol: 'HTTPS',
                  },
                ],
              },
            },
          },
          {
            id: 'my-fixed-uuid',
            name: '185-199-110-153',
            ruleType: {
              type: 'egress',
              egress: {
                domain: '185.199.110.153',
                ports: [
                  {
                    number: 443,
                    protocol: 'TCP',
                  },
                ],
              },
            },
          },
          {
            id: 'my-fixed-uuid',
            name: 'ae--1',
            ruleType: {
              type: 'egress',
              egress: {
                domain: 'ae::1',
                ports: [
                  {
                    number: 443,
                    protocol: 'TCP',
                  },
                ],
              },
            },
          },
        ],
      },
    },
  })
  const values: any = getMockValues()
  const valuesChanges: Changes = [
    {
      version: 2,
      customFunctions: ['networkPoliciesMigration'],
    },
  ]
  const deps: any = {
    cd: jest.fn(),
    rename: jest.fn(),
    hfValues: jest.fn().mockReturnValue(values),
    terminal,
    writeValues: jest.fn(),
  }
  it('should apply changes to services and create netpols ', async () => {
    await applyChanges(valuesChanges, false, deps)
    const expectedValues = getExpectedValues()
    expect(deps.writeValues).toHaveBeenCalledWith(expectedValues, true)
  }, 20000)
})

describe('getBuildName', () => {
  it('should generate a valid build name by combining name and tag', () => {
    const result = getBuildName('my-build', 'v1.0')
    expect(result).toBe('my-build-v1-0')
  })

  it('should convert the build name to lowercase', () => {
    const result = getBuildName('My-Build', 'V1.0')
    expect(result).toBe('my-build-v1-0')
  })

  it('should replace invalid characters with hyphens', () => {
    const result = getBuildName('my@build!', 'v1.0#')
    expect(result).toBe('my-build-v1-0')
  })

  it('should replace multiple consecutive hyphens with a single hyphen', () => {
    const result = getBuildName('my--build', 'v1--0')
    expect(result).toBe('my-build-v1-0')
  })

  it('should remove leading and trailing hyphens', () => {
    const result = getBuildName('-my-build-', '-v1.0-')
    expect(result).toBe('my-build-v1-0')
  })

  it('should handle empty name or tag gracefully', () => {
    const result = getBuildName('', 'v1.0')
    expect(result).toBe('v1-0')

    const result2 = getBuildName('my-build', '')
    expect(result2).toBe('my-build')

    const result3 = getBuildName('', '')
    expect(result3).toBe('')
  })
})

describe('Build image name migration', () => {
  const getMockValues = () => ({
    versions: { specVersion: 1 },
    teamConfig: {
      teamA: {
        builds: [
          {
            name: 'build-1',
            tag: 'latest',
            scanSource: true,
            externalRepo: false,
            mode: {
              docker: {
                path: './Dockerfile',
                repoUrl: 'https://github.com/tests',
                revision: 'HEAD',
              },
              type: 'docker',
            },
            trigger: false,
          },
        ],
      },
      teamB: {
        builds: [
          {
            name: 'build-2',
            tag: 'main',
            scanSource: true,
            externalRepo: false,
            mode: {
              docker: {
                path: './Dockerfile',
                repoUrl: 'https://github.com/tests',
                revision: 'HEAD',
              },
              type: 'docker',
            },
            trigger: false,
          },
        ],
      },
    },
  })

  const getExpectedValues = () => ({
    versions: { specVersion: 2 },
    teamConfig: {
      teamA: {
        builds: [
          {
            name: 'build-1-latest',
            imageName: 'build-1',
            tag: 'latest',
            scanSource: true,
            externalRepo: false,
            mode: {
              docker: {
                path: './Dockerfile',
                repoUrl: 'https://github.com/tests',
                revision: 'HEAD',
              },
              type: 'docker',
            },
            trigger: false,
          },
        ],
      },
      teamB: {
        builds: [
          {
            name: 'build-2-main',
            imageName: 'build-2',
            tag: 'main',
            scanSource: true,
            externalRepo: false,
            mode: {
              docker: {
                path: './Dockerfile',
                repoUrl: 'https://github.com/tests',
                revision: 'HEAD',
              },
              type: 'docker',
            },
            trigger: false,
          },
        ],
      },
    },
  })
  const values: any = getMockValues()
  const valuesChanges: Changes = [
    {
      version: 2,
      customFunctions: ['buildImageNameMigration'],
    },
  ]
  const deps: any = {
    cd: jest.fn(),
    rename: jest.fn(),
    hfValues: jest.fn().mockReturnValue(values),
    terminal,
    writeValues: jest.fn(),
  }
  it('should apply changes to build values ', async () => {
    await applyChanges(valuesChanges, false, deps)
    const expectedValues = getExpectedValues()
    expect(deps.writeValues).toHaveBeenCalledWith(expectedValues, true)
  }, 20000)
})

describe('teamSettingsMigration', () => {
  // Create a mock values object representing teams with settings that need migration.
  const getTeamSettingsMockValues = (): any => ({
    versions: { specVersion: 1 },
    teamConfig: {
      team1: {
        settings: {
          alerts: {
            email: 'test@example.com',
            opsgenie: 'ops_value',
            teams: 'keep this alert',
          },
          selfService: {
            service: ['ingress'],
            access: ['downloadKubeConfig', 'shell'],
            policies: ['edit policies'],
            apps: ['argocd', 'gitea'],
          },
        },
      },
      team2: {
        settings: {
          alerts: {
            teams: 'team2 alert',
          },
          selfService: {
            service: [],
            access: [],
            policies: [],
            apps: ['argocd'],
          },
        },
      },
    },
  })

  // Expected values after migration:
  // - The alerts block should have the 'email' and 'opsgenie' keys removed.
  // - The selfService arrays ('service', 'access', 'policies', 'apps') are replaced with a new
  //   teamMembers object with the correct boolean values.
  const getTeamSettingsExpectedValues = (): any => ({
    versions: { specVersion: 2 },
    teamConfig: {
      team1: {
        settings: {
          alerts: {
            teams: 'keep this alert',
          },
          selfService: {
            teamMembers: {
              createServices: true, // 'ingress' was present in service.
              editSecurityPolicies: true, // 'edit policies' was present in policies.
              useCloudShell: true, // 'shell' was present in access.
              downloadKubeconfig: true, // 'downloadKubeConfig' was present in access.
              downloadDockerLogin: false, // 'downloadDockerConfig' was not provided.
            },
          },
        },
      },
      team2: {
        settings: {
          alerts: {
            teams: 'team2 alert',
          },
          selfService: {
            teamMembers: {
              createServices: false,
              editSecurityPolicies: false,
              useCloudShell: false,
              downloadKubeconfig: false,
              downloadDockerLogin: false,
            },
          },
        },
      },
    },
  })

  // Set up the values and changes a flag to trigger the teamSettingsMigration.
  const teamSettingValues: any = getTeamSettingsMockValues()
  const valuesChanges: Changes = [
    {
      version: 2,
      customFunctions: ['teamSettingsMigration'],
    },
  ]
  const deps: any = {
    cd: jest.fn(),
    rename: jest.fn(),
    hfValues: jest.fn().mockReturnValue(teamSettingValues),
    terminal,
    writeValues: jest.fn(),
  }

  it('should migrate team settings correctly', async () => {
    await applyChanges(valuesChanges, false, deps)
    const expectedValues = getTeamSettingsExpectedValues()
    expect(deps.writeValues).toHaveBeenCalledWith(expectedValues, true)
  }, 20000)
})

jest.mock('glob')
describe('Policies migration', () => {
  const mockFilePaths = ['/path/to/env/teams/admin/policies.yaml', '/path/to/env/teams/alpha/policies.yaml']

  const policiesFileMap = getFileMap('AplTeamPolicy', env.ENV_DIR)
  const mockYamlContent = {
    '/path/to/env/teams/admin/policies.yaml': {
      metadata: { name: 'admin' },
      spec: { ruleA: { action: 'Audit' } },
    },
    '/path/to/env/teams/alpha/policies.yaml': {
      metadata: { name: 'alpha' },
      spec: { ruleB: { action: 'Enforce' } },
    },
  }

  const loadYaml = jest.fn((filePath: string) => mockYamlContent[filePath])
  const saveResourceGroupToFiles = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load and convert policies.yaml files into teamConfig and save them', async () => {
    ;(globSync as jest.Mock).mockReturnValue(mockFilePaths)

    await policiesMigration({}, { loadYaml, saveResourceGroupToFiles })

    expect(loadYaml).toHaveBeenCalledTimes(2)
    expect(loadYaml).toHaveBeenCalledWith('/path/to/env/teams/admin/policies.yaml')
    expect(loadYaml).toHaveBeenCalledWith('/path/to/env/teams/alpha/policies.yaml')

    expect(saveResourceGroupToFiles).toHaveBeenCalledWith(
      policiesFileMap,
      {
        teamConfig: {
          admin: { policies: { ruleA: { action: 'Audit' } } },
          alpha: { policies: { ruleB: { action: 'Enforce' } } },
        },
      },
      {},
    )
  })

  it('should not migrate if filepaths are empty', async () => {
    ;(globSync as jest.Mock).mockReturnValue([])

    await policiesMigration({}, { loadYaml, saveResourceGroupToFiles })

    expect(loadYaml).toHaveBeenCalledTimes(0)
    expect(saveResourceGroupToFiles).toHaveBeenCalledTimes(0)
  })
})

describe('setDefaultAplCatalog migration', () => {
  const valuesChanges: Changes = [
    {
      version: 2,
      customFunctions: ['setDefaultAplCatalog'],
    },
  ]

  const makeDeps = (values: any) => ({
    cd: jest.fn(),
    rename: jest.fn(),
    hfValues: jest.fn().mockReturnValue(values),
    terminal,
    writeValues: jest.fn(),
  })

  beforeEach(() => {
    const { getSealedSecretsPEM } = require('../common/k8s')
    const { encryptSecretItem } = require('@linode/kubeseal-encrypt')
    getSealedSecretsPEM.mockResolvedValue('mock-pem')
    encryptSecretItem.mockResolvedValue('encrypted-value')
  })

  it('should set gitea catalog URL and secretName when gitea credentials and domainSuffix are present', async () => {
    const values: any = {
      versions: { specVersion: 1 },
      cluster: { domainSuffix: 'test.example.com' },
      apps: { gitea: { adminUsername: 'admin', adminPassword: 'pass' } },
    }
    const deps: any = makeDeps(values)

    await applyChanges(valuesChanges, false, deps)
    expect(deps.writeValues).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogs: {
          default: {
            branch: 'main',
            enabled: true,
            name: 'default',
            url: 'https://gitea.test.example.com/otomi/charts.git',
            secretName: 'default-catalog-credentials',
          },
        },
      }),
      true,
    )
  }, 20000)

  it('should use fallback GitHub URL and no secretName when gitea credentials are missing', async () => {
    const values: any = {
      versions: { specVersion: 1 },
      cluster: { domainSuffix: 'test.example.com' },
    }
    const deps: any = makeDeps(values)

    await applyChanges(valuesChanges, false, deps)
    expect(deps.writeValues).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogs: {
          default: {
            branch: 'main',
            enabled: true,
            name: 'default',
            url: 'https://github.com/linode/apl-charts.git',
          },
        },
      }),
      true,
    )
  }, 20000)

  it('should use fallback GitHub URL when domainSuffix is missing even with gitea credentials', async () => {
    const values: any = {
      versions: { specVersion: 1 },
      apps: { gitea: { adminUsername: 'admin', adminPassword: 'pass' } },
    }
    const deps: any = makeDeps(values)

    await applyChanges(valuesChanges, false, deps)
    expect(deps.writeValues).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogs: {
          default: {
            branch: 'main',
            enabled: true,
            name: 'default',
            url: 'https://github.com/linode/apl-charts.git',
            secretName: 'default-catalog-credentials',
          },
        },
      }),
      true,
    )
  }, 20000)
})
