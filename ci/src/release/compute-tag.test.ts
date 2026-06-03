import { computeTag } from './compute-tag'

describe('computeTag', () => {
  it('returns the version as-is when not promoting to stable', () => {
    expect(computeTag('1.4.0-rc.1', false)).toBe('v1.4.0-rc.1')
    expect(computeTag('1.4.0-rc.9', false)).toBe('v1.4.0-rc.9')
  })

  it('strips the RC suffix when promoting to stable', () => {
    expect(computeTag('1.4.0-rc.3', true)).toBe('v1.4.0')
    expect(computeTag('6.0.0-rc.0', true)).toBe('v6.0.0')
  })
})
