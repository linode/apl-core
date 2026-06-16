import { appendFileSync } from 'fs'
import { execSync } from 'child_process'
import { computeDevVersion, highestTag } from './version'

const tagsRaw = execSync('git tag', { encoding: 'utf8' })
const tags = tagsRaw.trim().split('\n').filter(Boolean)
const highest = highestTag(tags)

if (!highest) {
  console.error('No tags found in repository — cannot compute dev version.')
  process.exit(1)
}

const shortSha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
const version = computeDevVersion(highest, shortSha)

console.log(`Highest tag: ${highest}`)
console.log(`Dev version: ${version}`)

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`)
}
