import { execSync } from 'child_process'

const branch = process.env.RELEASE_BRANCH!

execSync(`git checkout -b "${branch}"`, { stdio: 'inherit' })
console.log(`Created branch: ${branch}`)
