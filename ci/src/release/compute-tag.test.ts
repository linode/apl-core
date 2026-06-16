import { computeTag } from './compute-tag'

describe('computeTag', () => {
  it('returns next RC when branch has existing RC tags', () => {
    expect(computeTag(['v6.1.0-rc.2', 'v6.1.0-rc.1'], 'releases/v6.1', false)).toBe('v6.1.0-rc.3')
  })

  it('starts at rc.1 from branch name when no tags on branch', () => {
    expect(computeTag([], 'releases/v6.1', false)).toBe('v6.1.0-rc.1')
  })

  it('promotes highest RC to stable', () => {
    expect(computeTag(['v6.1.0-rc.3', 'v6.1.0-rc.2'], 'releases/v6.1', true)).toBe('v6.1.0')
  })

  it('throws when promoting to stable with no RC tags', () => {
    expect(() => computeTag([], 'releases/v6.1', true)).toThrow()
  })
})
