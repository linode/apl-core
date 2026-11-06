import { extractPrNumbers, filterAplBranches, parseReleaseRef } from './extract-apl-branches'

describe('extractPrNumbers', () => {
  it('extracts a PR number from a squash-merge commit subject', () => {
    const subjects = ['fix: disable apl-api netpols by default (#3833)']
    expect(extractPrNumbers(subjects)).toEqual([3833])
  })

  it('extracts a PR number from a merge commit subject', () => {
    const subjects = ['Merge pull request #3595 from linode/APL-1283-cas']
    expect(extractPrNumbers(subjects)).toEqual([3595])
  })

  it('returns unique, ascending PR numbers across multiple commits', () => {
    const subjects = [
      'feat: a (#3610)',
      'fix: b (#3595)',
      'chore: c (#3610)',
    ]
    expect(extractPrNumbers(subjects)).toEqual([3595, 3610])
  })

  it('ignores issue references that are not trailing PR markers', () => {
    const subjects = ['fix: resolves #123 without a PR marker', 'docs: update readme']
    expect(extractPrNumbers(subjects)).toEqual([])
  })

  it('returns an empty array when there are no commits', () => {
    expect(extractPrNumbers([])).toEqual([])
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
