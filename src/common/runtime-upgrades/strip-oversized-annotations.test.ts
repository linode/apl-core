import { stripOversizedLastAppliedAnnotations } from './strip-oversized-annotations'

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

describe('stripOversizedLastAppliedAnnotations', () => {
  const annotation = 'kubectl.kubernetes.io/last-applied-configuration'
  const oversizedValue = 'x'.repeat(262145)

  const mockListCRDs = jest.fn()
  const mockPatchCRD = jest.fn()
  const mockListConfigMaps = jest.fn()
  const mockPatchConfigMap = jest.fn()

  const mockDeps = {
    getCrdApi: () => ({ listCustomResourceDefinition: mockListCRDs, patchCustomResourceDefinition: mockPatchCRD }),
    getCoreApi: () => ({
      listConfigMapForAllNamespaces: mockListConfigMaps,
      patchNamespacedConfigMap: mockPatchConfigMap,
    }),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockListCRDs.mockResolvedValue({ items: [] })
    mockListConfigMaps.mockResolvedValue({ items: [] })
    mockPatchCRD.mockResolvedValue({})
    mockPatchConfigMap.mockResolvedValue({})
  })

  it('removes last-applied-configuration from a CRD whose annotation exceeds the limit', async () => {
    mockListCRDs.mockResolvedValue({
      items: [{ metadata: { name: 'clusterpolicies.kyverno.io', annotations: { [annotation]: oversizedValue } } }],
    })

    await stripOversizedLastAppliedAnnotations(mockDeps as any)

    expect(mockPatchCRD).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'clusterpolicies.kyverno.io' }),
      expect.anything(),
    )
  })

  it('removes last-applied-configuration from a ConfigMap whose annotation exceeds the limit', async () => {
    mockListConfigMaps.mockResolvedValue({
      items: [
        {
          metadata: {
            name: 'grafana-dashboards-k8s-admin',
            namespace: 'grafana',
            annotations: { [annotation]: oversizedValue },
          },
        },
      ],
    })

    await stripOversizedLastAppliedAnnotations(mockDeps as any)

    expect(mockPatchConfigMap).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'grafana-dashboards-k8s-admin', namespace: 'grafana' }),
      expect.anything(),
    )
  })

  it('does not patch a ConfigMap without the annotation', async () => {
    mockListConfigMaps.mockResolvedValue({
      items: [{ metadata: { name: 'some-config', namespace: 'default', annotations: {} } }],
    })

    await stripOversizedLastAppliedAnnotations(mockDeps as any)

    expect(mockPatchConfigMap).not.toHaveBeenCalled()
  })
})
