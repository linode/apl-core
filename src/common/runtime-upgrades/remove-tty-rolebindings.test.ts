import { removeTtyRoleBindings } from './remove-tty-rolebindings'

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

describe('removeTtyRoleBindings', () => {
  const mockListRoleBindings = jest.fn()
  const mockDeleteRoleBinding = jest.fn()

  const mockDeps = {
    getRbacApi: () => ({
      listRoleBindingForAllNamespaces: mockListRoleBindings,
      deleteNamespacedRoleBinding: mockDeleteRoleBinding,
    }),
  }

  const roleBinding = (name: string, namespace: string) => ({ metadata: { name, namespace } })

  beforeEach(() => {
    jest.clearAllMocks()
    mockListRoleBindings.mockResolvedValue({ items: [] })
    mockDeleteRoleBinding.mockResolvedValue({})
  })

  it('deletes tty- RoleBindings in team namespaces', async () => {
    mockListRoleBindings.mockResolvedValue({
      items: [roleBinding('tty-admin', 'team-demo'), roleBinding('tty-dev', 'team-other')],
    })

    await removeTtyRoleBindings(mockDeps as any)

    expect(mockDeleteRoleBinding).toHaveBeenCalledTimes(1)
    expect(mockDeleteRoleBinding).not.toHaveBeenCalledWith({ name: 'tty-admin', namespace: 'team-demo' })
    expect(mockDeleteRoleBinding).toHaveBeenCalledWith({ name: 'tty-dev', namespace: 'team-other' })
  })

  it('ignores RoleBindings outside team namespaces or without the tty- prefix', async () => {
    mockListRoleBindings.mockResolvedValue({
      items: [
        roleBinding('tty-admin', 'default'),
        roleBinding('team-admin', 'team-demo'),
        roleBinding('my-tty-admin', 'team-demo'),
      ],
    })

    await removeTtyRoleBindings(mockDeps as any)

    expect(mockDeleteRoleBinding).not.toHaveBeenCalled()
  })

  it('continues deleting when one deletion fails', async () => {
    mockListRoleBindings.mockResolvedValue({
      items: [roleBinding('tty-a', 'team-demo'), roleBinding('tty-b', 'team-demo')],
    })
    mockDeleteRoleBinding.mockRejectedValueOnce(new Error('boom'))

    await expect(removeTtyRoleBindings(mockDeps as any)).resolves.toBeUndefined()

    expect(mockDeleteRoleBinding).toHaveBeenCalledTimes(2)
  })
})
