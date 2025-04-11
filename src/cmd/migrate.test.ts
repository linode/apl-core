import { applyChanges, Changes, filterChanges, getBuildName } from 'src/cmd/migrate'
import stubs from 'src/test-stubs'

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'my-fixed-uuid'),
}))

const { terminal } = stubs

describe('Upgrading values', () => {
  const oldVersion = 1
  const mockValues = {
    teamConfig: {
      teamA: {
        services: [
          { name: 'svc1', prop: 'replaceMe', bla: [{ ok: 'replaceMe' }] },
          { name: 'svc1', prop: 'replaceMe', di: [{ ok: 'replaceMeNot' }] },
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
      deletions: ['some.json.path'],
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
  ]

  describe('Filter changes', () => {
    it('should only select changes whose version >= current version', () => {
      expect(filterChanges(oldVersion, mockChanges)).toEqual(mockChanges.slice(1, 3))
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
      expect(deps.writeValues).toBeCalledWith(
        {
          teamConfig: {
            teamA: {
              services: [
                { name: 'svc1', prop: 'replaced', bla: [{ ok: 'replaceMe' }] },
                { name: 'svc1', prop: 'replaced', di: [{ ok: 'replaceMeNot' }] },
              ],
            },
          },
          some: { bla: {}, k8sVersion: '1.18' },
          versions: { specVersion: 3 },
        },
        true,
      )
      expect(deps.rename).toBeCalledWith(`somefile.yaml`, `newloc.yaml`, false)
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
    expect(deps.writeValues).toBeCalledWith(
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
  const valuesChanges: any = {
    version: 2,
    networkPoliciesMigration: true,
  }
  const deps: any = {
    cd: jest.fn(),
    rename: jest.fn(),
    hfValues: jest.fn().mockReturnValue(values),
    terminal,
    writeValues: jest.fn(),
  }
  it('should apply changes to services and create netpols ', async () => {
    await applyChanges([valuesChanges], false, deps)
    const expectedValues = getExpectedValues()
    expect(deps.writeValues).toBeCalledWith(expectedValues, true)
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
  const valuesChanges: any = {
    version: 2,
    buildImageNameMigration: true,
  }
  const deps: any = {
    cd: jest.fn(),
    rename: jest.fn(),
    hfValues: jest.fn().mockReturnValue(values),
    terminal,
    writeValues: jest.fn(),
  }
  it('should apply changes to build values ', async () => {
    await applyChanges([valuesChanges], false, deps)
    const expectedValues = getExpectedValues()
    expect(deps.writeValues).toBeCalledWith(expectedValues, true)
  }, 20000)
})
