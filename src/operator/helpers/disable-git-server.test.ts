import { disableGitServerIfMigrated } from './disable-git-server'

const GIT_SERVER_REPO_URL = 'http://git-server.git-server.svc.cluster.local/otomi/values.git'
const BYO_REPO_URL = 'https://github.com/org/repo.git'

function makeApp(repoURL: string) {
  return { spec: { source: { repoURL } } }
}

function makeDeps(overrides: { getArgoCdApp?: jest.Mock; writeValues?: jest.Mock } = {}) {
  return {
    getArgoCdApp: jest.fn().mockResolvedValue(makeApp(BYO_REPO_URL)),
    writeValues: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const valuesEnabled = {
  otomi: { git: { repoUrl: BYO_REPO_URL } },
  apps: { 'git-server': { enabled: true } },
}

describe('disableGitServerIfMigrated', () => {
  it('is a no-op when git-server.enabled is false', async () => {
    const deps = makeDeps()
    await disableGitServerIfMigrated(
      { otomi: { git: { repoUrl: BYO_REPO_URL } }, apps: { 'git-server': { enabled: false } } },
      deps,
    )
    expect(deps.writeValues).not.toHaveBeenCalled()
  })

  it('is a no-op when git-server.enabled is undefined', async () => {
    const deps = makeDeps()
    await disableGitServerIfMigrated({ apps: {}, otomi: { git: { repoUrl: BYO_REPO_URL } } }, deps)
    expect(deps.writeValues).not.toHaveBeenCalled()
  })

  it('is a no-op when otomi.git.repoUrl is the git-server URL', async () => {
    const deps = makeDeps()
    await disableGitServerIfMigrated(
      { apps: { 'git-server': { enabled: true } }, otomi: { git: { repoUrl: GIT_SERVER_REPO_URL } } },
      deps,
    )
    expect(deps.writeValues).not.toHaveBeenCalled()
  })

  it('is a no-op when an ArgoCD app still points to git-server', async () => {
    const deps = makeDeps({
      getArgoCdApp: jest
        .fn()
        .mockResolvedValueOnce(makeApp(BYO_REPO_URL)) // apl-operator-apl-operator
        .mockResolvedValueOnce(makeApp(GIT_SERVER_REPO_URL)) // argocd-argocd
        .mockResolvedValueOnce(makeApp(BYO_REPO_URL)), // otomi-otomi-api
    })
    await disableGitServerIfMigrated(valuesEnabled, deps)
    expect(deps.writeValues).not.toHaveBeenCalled()
  })

  it('skips a not-found (404) app and continues checking others', async () => {
    const deps = makeDeps({
      getArgoCdApp: jest.fn().mockResolvedValue(undefined),
    })
    await disableGitServerIfMigrated(valuesEnabled, deps)
    expect(deps.writeValues).toHaveBeenCalledWith({ apps: { 'git-server': { enabled: false } } })
  })

  it('is a no-op and does not throw when getArgoCdApp throws a non-404 error', async () => {
    const deps = makeDeps({
      getArgoCdApp: jest.fn().mockRejectedValue(new Error('network error')),
    })
    await expect(disableGitServerIfMigrated(valuesEnabled, deps)).resolves.not.toThrow()
    expect(deps.writeValues).not.toHaveBeenCalled()
  })

  it('disables git-server and checks all 3 apps when all conditions are met', async () => {
    const deps = makeDeps()
    await disableGitServerIfMigrated(valuesEnabled, deps)
    expect(deps.writeValues).toHaveBeenCalledWith({ apps: { 'git-server': { enabled: false } } })
    expect(deps.getArgoCdApp).toHaveBeenCalledTimes(3)
    expect(deps.getArgoCdApp).toHaveBeenCalledWith('apl-operator-apl-operator', expect.anything())
    expect(deps.getArgoCdApp).toHaveBeenCalledWith('argocd-argocd', expect.anything())
    expect(deps.getArgoCdApp).toHaveBeenCalledWith('otomi-otomi-api', expect.anything())
  })
})
