import { removeTeamGrafanaSecrets } from './remove-team-grafana-secrets'

jest.mock('../debug', () => ({
  ...jest.requireActual('../debug'),
  terminal: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    stream: { log: process.stdout, error: process.stderr },
  })),
}))

describe('removeTeamGrafanaSecrets', () => {
  const mockListSecrets = jest.fn()
  const mockDeleteSecret = jest.fn()

  const mockDeps = {
    getCoreApi: () => ({
      listSecretForAllNamespaces: mockListSecrets,
      deleteNamespacedSecret: mockDeleteSecret,
    }),
  }

  const secret = (name: string, namespace: string) => ({ metadata: { name, namespace } })

  beforeEach(() => {
    jest.clearAllMocks()
    mockListSecrets.mockResolvedValue({ items: [] })
    mockDeleteSecret.mockResolvedValue({})
  })

  it('queries only ESO-managed secrets', async () => {
    await removeTeamGrafanaSecrets(mockDeps as any)

    expect(mockListSecrets).toHaveBeenCalledWith({ labelSelector: 'reconcile.external-secrets.io/managed=true' })
  })

  it('deletes the three Grafana secrets in team namespaces', async () => {
    mockListSecrets.mockResolvedValue({
      items: [
        secret('team-demo-grafana-admin', 'team-demo'),
        secret('grafana-oidc-secret', 'team-demo'),
        secret('grafana-loki-datasource-secret', 'team-demo'),
      ],
    })

    await removeTeamGrafanaSecrets(mockDeps as any)

    expect(mockDeleteSecret).toHaveBeenCalledTimes(3)
    expect(mockDeleteSecret).toHaveBeenCalledWith({ name: 'team-demo-grafana-admin', namespace: 'team-demo' })
    expect(mockDeleteSecret).toHaveBeenCalledWith({ name: 'grafana-oidc-secret', namespace: 'team-demo' })
    expect(mockDeleteSecret).toHaveBeenCalledWith({ name: 'grafana-loki-datasource-secret', namespace: 'team-demo' })
  })

  it('matches the admin secret against its own namespace prefix', async () => {
    mockListSecrets.mockResolvedValue({
      items: [
        // admin secret name must equal '<namespace>-grafana-admin' for that namespace
        secret('team-demo-grafana-admin', 'team-demo'),
        secret('team-demo-grafana-admin', 'team-other'),
      ],
    })

    await removeTeamGrafanaSecrets(mockDeps as any)

    expect(mockDeleteSecret).toHaveBeenCalledTimes(1)
    expect(mockDeleteSecret).toHaveBeenCalledWith({ name: 'team-demo-grafana-admin', namespace: 'team-demo' })
    expect(mockDeleteSecret).not.toHaveBeenCalledWith({ name: 'team-demo-grafana-admin', namespace: 'team-other' })
  })

  it('ignores secrets outside team namespaces or with other names', async () => {
    mockListSecrets.mockResolvedValue({
      items: [
        secret('demo-grafana-admin', 'grafana'),
        secret('grafana-oidc-secret', 'grafana'),
        secret('team-demo-grafana-admin', 'default'),
        secret('some-team-secret', 'team-demo'),
      ],
    })

    await removeTeamGrafanaSecrets(mockDeps as any)

    expect(mockDeleteSecret).not.toHaveBeenCalled()
  })

  it('continues deleting when one deletion fails', async () => {
    mockListSecrets.mockResolvedValue({
      items: [secret('grafana-oidc-secret', 'team-demo'), secret('grafana-loki-datasource-secret', 'team-demo')],
    })
    mockDeleteSecret.mockRejectedValueOnce(new Error('boom'))

    await expect(removeTeamGrafanaSecrets(mockDeps as any)).resolves.toBeUndefined()

    expect(mockDeleteSecret).toHaveBeenCalledTimes(2)
  })
})
