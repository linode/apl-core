import { execFileSync } from 'child_process'

export function extractPrNumbers(releaseBody: string): number[] {
  const numbers = new Set<number>()
  for (const match of releaseBody.matchAll(/pull\/(\d+)/g)) {
    numbers.add(Number(match[1]))
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

function ghApi(endpoint: string, jq: string): string {
  return execFileSync('gh', ['api', endpoint, '--jq', jq], {
    encoding: 'utf8',
  }).trim()
}

function fetchReleaseBody(repo: string, tag: string): string {
  return ghApi(`repos/${repo}/releases/tags/${tag}`, '.body')
}

function fetchBranchName(repo: string, prNumber: number): string {
  return ghApi(`repos/${repo}/pulls/${prNumber}`, '.head.ref')
}

function main() {
  const [releaseArg, repoArg] = process.argv.slice(2)

  if (!releaseArg) {
    console.error('Usage: tsx src/extract-apl-branches.ts <release-tag|release-url> [owner/repo]')
    process.exit(1)
  }

  const { repo: repoFromUrl, tag } = parseReleaseRef(releaseArg)
  const repo = repoArg ?? repoFromUrl ?? DEFAULT_REPO

  const body = fetchReleaseBody(repo, tag)
  const prNumbers = extractPrNumbers(body)
  const branches = prNumbers.map((prNumber) => fetchBranchName(repo, prNumber))
  const aplBranches = filterAplBranches(branches)

  for (const branch of aplBranches) {
    console.log(branch)
  }
}

if (require.main === module) {
  main()
}
