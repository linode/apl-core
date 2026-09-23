import { extractPrNumbers, filterAplBranches, parseReleaseRef } from './extract-apl-branches'

describe('extractPrNumbers', () => {
  it('extracts a PR number from a pull link', () => {
    const body = '* fix: something by @user in https://github.com/linode/apl-core/pull/3595'
    expect(extractPrNumbers(body)).toEqual([3595])
  })

  it('returns unique, ascending PR numbers across multiple links', () => {
    const body = [
      '* a in https://github.com/linode/apl-core/pull/3610',
      '* b in https://github.com/linode/apl-core/pull/3595',
      '* c in https://github.com/linode/apl-core/pull/3610',
    ].join('\n')
    expect(extractPrNumbers(body)).toEqual([3595, 3610])
  })

  it('returns an empty array when there are no pull links', () => {
    expect(extractPrNumbers('no links here')).toEqual([])
  })
})

describe('filterAplBranches', () => {
  it('keeps branches following the APL-<number> pattern', () => {
    expect(filterAplBranches(['APL-1283'])).toEqual(['APL-1283'])
  })

  it('strips the postfix from a matching branch', () => {
    expect(filterAplBranches(['APL-1283-cas'])).toEqual(['APL-1283'])
  })

  it('drops branches that do not match the pattern', () => {
    expect(filterAplBranches(['feat/add-nodeselector', 'dependabot/npm/foo'])).toEqual([])
  })

  it('returns unique, sorted branch names after stripping postfixes', () => {
    const branches = ['APL-200-b', 'APL-100-a', 'APL-200-crds']
    expect(filterAplBranches(branches)).toEqual(['APL-100', 'APL-200'])
  })
})

describe('parseReleaseRef', () => {
  it('derives repo and tag from a release URL', () => {
    const url = 'https://github.com/linode/apl-core/releases/tag/v6.4.0-rc.1'
    expect(parseReleaseRef(url)).toEqual({ repo: 'linode/apl-core', tag: 'v6.4.0-rc.1' })
  })

  it('treats a plain tag as a tag with no repo', () => {
    expect(parseReleaseRef('v6.4.0-rc.1')).toEqual({ tag: 'v6.4.0-rc.1' })
  })
})
