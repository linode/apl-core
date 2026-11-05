import { execFileSync } from 'child_process'

export function extractPrNumbers(commitSubjects: string[]): number[] {
  const numbers = new Set<number>()
  for (const subject of commitSubjects) {
    const squash = subject.match(/\(#(\d+)\)\s*$/)
    if (squash) {
      numbers.add(Number(squash[1]))
      continue
    }
    const merge = subject.match(/^Merge pull request #(\d+)/)
    if (merge) numbers.add(Number(merge[1]))
  }
  return [...numbers].sort((a, b) => a - b)
}

export function filterAplBranches(branches: string[]): string[] {
  const normalized: string[] = []
  for (const branch of branches) {
    const match = branch.match(/APL-\d+/)
    if (match) normalized.push(match[0])
  }
  return [...new Set(normalized)].sort((a, b) => a.localeCompare(b))
}

export function parseReleaseRef(input: string): { repo?: string; tag: string } {
  const url = input.match(/github\.com\/([^/]+\/[^/]+)\/releases\/tag\/(.+)$/)
  if (url) return { repo: url[1], tag: url[2] }
  return { tag: input }
}

const DEFAULT_REPO = 'linode/apl-core'

function ghApi(endpoint: string, jq: string, paginate = false): string {
  const args = ['api', endpoint, '--jq', jq]
  if (paginate) args.push('--paginate')
  return execFileSync('gh', args, {
    encoding: 'utf8',
  }).trim()
}

function fetchCommitSubjects(repo: string, baseTag: string, headTag: string): string[] {
  const output = ghApi(
    `repos/${repo}/compare/${baseTag}...${headTag}?per_page=100`,
    '.commits[].commit.message | split("\n")[0]',
    true,
  )
  return output ? output.split('\n') : []
}

function fetchBranchName(repo: string, prNumber: number): string {
  return ghApi(`repos/${repo}/pulls/${prNumber}`, '.head.ref')
}

function main() {
  const [baseArg, headArg, repoArg] = process.argv.slice(2)

  if (!baseArg || !headArg) {
    console.error('Usage: tsx src/extract-apl-branches.ts <base-tag> <head-tag|release-url> [owner/repo]')
    process.exit(1)
  }

  const { repo: repoFromUrl, tag } = parseReleaseRef(headArg)
  const repo = repoArg ?? repoFromUrl ?? DEFAULT_REPO

  const subjects = fetchCommitSubjects(repo, baseArg, tag)
  const prNumbers = extractPrNumbers(subjects)
  const branches = prNumbers.map((prNumber) => fetchBranchName(repo, prNumber))
  const aplBranches = filterAplBranches(branches)

  for (const branch of aplBranches) {
    console.log(branch)
  }
}

if (require.main === module) {
  main()
}
