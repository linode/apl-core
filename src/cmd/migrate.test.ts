import { applyChanges, Changes, filterChanges } from 'src/cmd/migrate'
import stubs from 'src/test-stubs'

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
    version: oldVersion,
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
          version: 3,
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
    }

    valuesChanges = {
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
      },
      true,
    )
  })
})

const getMockValues = () => ({
  teamConfig: {
    teamA: {
      selfService: { service: ['ingress', 'networkPolicy'] },
      services: [
        { name: 'svc1', networkPolicy: { ingressPrivate: { mode: 'AllowAll' } } },
        {
          id: 'svc2',
          networkPolicy: {
            ingressPrivate: {
              mode: 'AllowOnly',
            },
          },
        },
        {
          name: 'svc3',
          networkPolicy: {
            ingressPrivate: {
              mode: 'DenyAll',
            },
          },
        },
        { id: 'svc4', name: 'svc4' },
        { name: 'svc5', networkPolicy: { ingressPrivate: { mode: 'AllowAll' }, podSelector: 'test-label-value' } },
        {
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
          name: 'svc7',
          networkPolicy: {
            podSelector: 'test-label-value',
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
  teamConfig: {
    teamA: {
      selfService: { service: ['ingress'] },
      services: [
        { name: 'svc1' },
        { id: 'svc2' },
        { name: 'svc3' },
        { id: 'svc4', name: 'svc4' },
        { name: 'svc5' },
        { name: 'svc6' },
      ],
      netpols: [
        { name: 'svc1', ruleType: { type: 'ingress', ingress: { mode: 'AllowAll' } } },
        { id: 'svc2-ingress', ruleType: { type: 'ingress', ingress: { mode: 'AllowOnly' } } },
        {
          name: 'svc5',
          ruleType: {
            type: 'ingress',
            ingress: { mode: 'AllowAll', toLabelName: 'otomi.io/app', toLabelValue: 'test-label-value' },
          },
        },
        {
          name: 'svc6',
          ruleType: {
            type: 'ingress',
            ingress: {
              mode: 'AllowOnly',
              allow: [
                { fromNamespace: 'team-team1' },
                { fromNamespace: 'team-team2', fromLabelName: 'otomi.io/app', fromLabelValue: 'svc6' },
              ],
            },
          },
        },
      ],
    },
    teamB: {
      services: [{ name: 'svc7' }],
      netpols: [
        {
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
              toLabelValue: 'test-label-value',
            },
          },
        },
        {
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

describe('Network policies migrations', () => {
  const values: any = getMockValues()
  const valuesChanges: any = {
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
  })
})
