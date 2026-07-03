import { buildDepMap, diffCharts, renderTable } from './compare-charts'

describe('buildDepMap', () => {
  it('maps name to version', () => {
    const result = buildDepMap({ dependencies: [{ name: 'cert-manager', version: 'v1.0.0' }] })
    expect(result.get('cert-manager')).toBe('v1.0.0')
  })

  it('handles empty dependencies', () => {
    expect(buildDepMap({ dependencies: [] }).size).toBe(0)
  })
})

describe('diffCharts', () => {
  it('detects updated app', () => {
    const old = new Map([['cert-manager', 'v1.0.0']])
    const next = new Map([['cert-manager', 'v1.1.0']])
    expect(diffCharts(old, next)).toEqual([{ name: 'cert-manager', oldVersion: 'v1.0.0', newVersion: 'v1.1.0', notes: 'Updated' }])
  })

  it('detects new app', () => {
    const old = new Map<string, string>()
    const next = new Map([['loki', '2.0.0']])
    expect(diffCharts(old, next)).toEqual([{ name: 'loki', oldVersion: '', newVersion: '2.0.0', notes: 'New' }])
  })

  it('detects removed app', () => {
    const old = new Map([['loki', '2.0.0']])
    const next = new Map<string, string>()
    expect(diffCharts(old, next)).toEqual([{ name: 'loki', oldVersion: '2.0.0', newVersion: '', notes: 'Removed' }])
  })

  it('excludes unchanged apps', () => {
    const old = new Map([['cert-manager', 'v1.0.0']])
    const next = new Map([['cert-manager', 'v1.0.0']])
    expect(diffCharts(old, next)).toEqual([])
  })

  it('orders groups: New then Removed then Updated', () => {
    const old = new Map([['alpha', '1.0'], ['beta', '1.0']])
    const next = new Map([['alpha', '2.0'], ['gamma', '1.0']])
    const rows = diffCharts(old, next)
    expect(rows.map(r => r.notes)).toEqual(['New', 'Removed', 'Updated'])
  })

  it('sorts alphabetically within each group', () => {
    const old = new Map([['zebra', '1.0'], ['apple', '1.0']])
    const next = new Map([['mango', '1.0'], ['fig', '1.0']])
    const rows = diffCharts(old, next)
    const newRows = rows.filter(r => r.notes === 'New')
    const removedRows = rows.filter(r => r.notes === 'Removed')
    expect(newRows.map(r => r.name)).toEqual(['fig', 'mango'])
    expect(removedRows.map(r => r.name)).toEqual(['apple', 'zebra'])
  })
})

describe('renderTable', () => {
  it('renders header and separator', () => {
    const output = renderTable([])
    expect(output).toContain('| App Name | Old Version | New Version | Notes |')
    expect(output).toContain('|----------|-------------|-------------|-------|')
  })

  it('renders a row for each entry', () => {
    const rows = [{ name: 'cert-manager', oldVersion: 'v1.0.0', newVersion: 'v1.1.0', notes: 'Updated' as const }]
    expect(renderTable(rows)).toContain('| cert-manager | v1.0.0 | v1.1.0 | Updated |')
  })

  it('renders empty version cells for new and removed entries', () => {
    const rows = [
      { name: 'loki', oldVersion: '', newVersion: '2.0.0', notes: 'New' as const },
      { name: 'tempo', oldVersion: '1.0.0', newVersion: '', notes: 'Removed' as const },
    ]
    const output = renderTable(rows)
    expect(output).toContain('| loki |  | 2.0.0 | New |')
    expect(output).toContain('| tempo | 1.0.0 |  | Removed |')
  })
})
