import { config } from 'dotenv'
import { readFileSync } from 'fs'
import path from 'path'
import { versionMatchesBranch } from './version'

config()

const releaseBranch = process.env.RELEASE_BRANCH!
const repoRoot = process.env.REPO_ROOT ?? path.resolve(__dirname, '../../..')

const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'))
const version: string = pkg.version

if (!versionMatchesBranch(version, releaseBranch)) {
  console.error(
    `Version mismatch: package.json is at "${version}" but branch is "${releaseBranch}". ` +
    `Expected major.minor to be "${releaseBranch.replace('releases/v', '')}".`,
  )
  process.exit(1)
}

console.log(`Version "${version}" matches branch "${releaseBranch}"`)
