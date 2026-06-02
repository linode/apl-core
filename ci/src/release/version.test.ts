import {
  validateVersion,
  validateMinorVersion,
  cycleStartVersion,
  releaseBranchName,
  incrementRc,
  promoteToStable,
  nextPatchRc,
  nextMainVersion,
  versionMatchesBranch,
  previousStableTag,
  isHighestStableTag,
  previousRcTag,
  previousStableTagBefore,
} from './version'

describe('validateVersion', () => {
  it.each([
    ['1.4.0', true],
    ['1.4.0-rc.1', true],
    ['1.4.0-rc.10', true],
    ['6.0.0-rc.0', true],
    ['v1.4.0', false],
    ['v1.4.0-rc.1', false],
    ['1.4', false],
    ['1.4.0-beta.1', false],
    ['1.4.0-rc', false],
    ['latest', false],
    ['', false],
    ['1.4.0-rc.1.2', false],
  ])('validateVersion(%s) → %s', (version, expected) => {
    expect(validateVersion(version)).toBe(expected)
  })
})

describe('validateMinorVersion', () => {
  it.each([
    ['1.4', true],
    ['6.0', true],
    ['10.12', true],
    ['1.4.0', false],
    ['1.4.0-rc.1', false],
    ['1', false],
    ['v1.4', false],
    ['', false],
  ])('validateMinorVersion(%s) → %s', (v, expected) => {
    expect(validateMinorVersion(v)).toBe(expected)
  })
})

describe('cycleStartVersion', () => {
  it.each([
    ['1.4', '1.4.0-rc.1'],
    ['6.0', '6.0.0-rc.1'],
    ['10.12', '10.12.0-rc.1'],
  ])('cycleStartVersion(%s) → %s', (minorVersion, expected) => {
    expect(cycleStartVersion(minorVersion)).toBe(expected)
  })
})

describe('releaseBranchName', () => {
  it.each([
    ['1.4.0-rc.1', 'release/v1.4'],
    ['1.4.0', 'release/v1.4'],
    ['6.0.0-rc.0', 'release/v6.0'],
    ['1.4.1', 'release/v1.4'],
  ])('releaseBranchName(%s) → %s', (version, expected) => {
    expect(releaseBranchName(version)).toBe(expected)
  })
})

describe('incrementRc', () => {
  it.each([
    ['1.4.0-rc.1', '1.4.0-rc.2'],
    ['1.4.0-rc.9', '1.4.0-rc.10'],
    ['6.0.0-rc.0', '6.0.0-rc.1'],
  ])('incrementRc(%s) → %s', (version, expected) => {
    expect(incrementRc(version)).toBe(expected)
  })
})

describe('promoteToStable', () => {
  it.each([
    ['1.4.0-rc.1', '1.4.0'],
    ['1.4.0-rc.3', '1.4.0'],
    ['6.0.0-rc.0', '6.0.0'],
  ])('promoteToStable(%s) → %s', (version, expected) => {
    expect(promoteToStable(version)).toBe(expected)
  })
})

describe('nextPatchRc', () => {
  it.each([
    ['1.4.0', '1.4.1-rc.1'],
    ['1.4.5', '1.4.6-rc.1'],
    ['6.0.0', '6.0.1-rc.1'],
  ])('nextPatchRc(%s) → %s', (version, expected) => {
    expect(nextPatchRc(version)).toBe(expected)
  })
})

describe('nextMainVersion', () => {
  it.each([
    ['1.4.0-rc.1', '1.5.0-rc.0'],
    ['1.4.0', '1.5.0-rc.0'],
    ['6.0.0-rc.0', '6.1.0-rc.0'],
  ])('nextMainVersion(%s) → %s', (version, expected) => {
    expect(nextMainVersion(version)).toBe(expected)
  })
})

describe('versionMatchesBranch', () => {
  it.each([
    ['1.4.0-rc.2', 'release/v1.4', true],
    ['1.4.0', 'release/v1.4', true],
    ['1.4.1-rc.1', 'release/v1.4', true],
    ['1.5.0-rc.1', 'release/v1.4', false],
    ['1.4.0-rc.1', 'release/v1.5', false],
  ])('versionMatchesBranch(%s, %s) → %s', (version, branch, expected) => {
    expect(versionMatchesBranch(version, branch)).toBe(expected)
  })
})

describe('previousStableTag', () => {
  it('returns the second-highest stable tag', () => {
    const tags = ['v1.4.0', 'v1.3.5', 'v1.3.4', 'v1.4.0-rc.2', 'v1.4.0-rc.1']
    expect(previousStableTag(tags)).toBe('v1.3.5')
  })

  it('skips all rc tags', () => {
    const tags = ['v1.4.0', 'v1.3.5', 'v1.4.0-rc.2']
    expect(previousStableTag(tags)).toBe('v1.3.5')
  })

  it('returns null when fewer than two stable tags exist', () => {
    expect(previousStableTag(['v1.4.0', 'v1.4.0-rc.1'])).toBeNull()
    expect(previousStableTag([])).toBeNull()
  })
})

describe('previousRcTag', () => {
  it('returns the previous RC tag in the same major.minor series', () => {
    const tags = ['v1.4.0-rc.2', 'v1.4.0-rc.1', 'v1.4.0-rc.0', 'v1.3.5']
    expect(previousRcTag('v1.4.0-rc.2', tags)).toBe('v1.4.0-rc.1')
  })

  it('excludes the current tag from consideration', () => {
    const tags = ['v1.4.0-rc.1', 'v1.4.0-rc.0']
    expect(previousRcTag('v1.4.0-rc.1', tags)).toBe('v1.4.0-rc.0')
  })

  it('ignores RC tags from other major.minor series', () => {
    const tags = ['v1.4.0-rc.1', 'v1.3.0-rc.2']
    expect(previousRcTag('v1.4.0-rc.1', tags)).toBeNull()
  })

  it('returns null when no previous RC tag exists', () => {
    expect(previousRcTag('v1.4.0-rc.0', ['v1.4.0-rc.0'])).toBeNull()
  })
})

describe('previousStableTagBefore', () => {
  it('returns the highest stable tag strictly before the given tag', () => {
    const tags = ['v1.4.0', 'v1.3.5', 'v1.3.4']
    expect(previousStableTagBefore('v1.4.0', tags)).toBe('v1.3.5')
  })

  it('handles backport patches correctly', () => {
    // releasing v1.3.6 when v1.4.0 already exists — should return v1.3.5, not v1.4.0
    const tags = ['v1.4.0', 'v1.3.6', 'v1.3.5']
    expect(previousStableTagBefore('v1.3.6', tags)).toBe('v1.3.5')
  })

  it('ignores RC tags', () => {
    const tags = ['v1.4.0', 'v1.3.5', 'v1.4.0-rc.2']
    expect(previousStableTagBefore('v1.4.0', tags)).toBe('v1.3.5')
  })

  it('returns null when no previous stable tag exists', () => {
    expect(previousStableTagBefore('v1.4.0', ['v1.4.0'])).toBeNull()
  })
})

describe('isHighestStableTag', () => {
  it('returns true when the new tag is strictly higher than all existing stable tags', () => {
    expect(isHighestStableTag('v1.4.1', ['v1.4.0', 'v1.3.5'])).toBe(true)
  })

  it('returns false when a higher stable tag already exists', () => {
    expect(isHighestStableTag('v1.3.5', ['v1.4.0', 'v1.3.4'])).toBe(false)
  })

  it('ignores rc tags when comparing', () => {
    expect(isHighestStableTag('v1.4.1', ['v1.4.0', 'v1.5.0-rc.1'])).toBe(true)
  })

  it('returns true when no existing stable tags exist', () => {
    expect(isHighestStableTag('v1.4.0', [])).toBe(true)
    expect(isHighestStableTag('v1.4.0', ['v1.4.0-rc.1'])).toBe(true)
  })
})
