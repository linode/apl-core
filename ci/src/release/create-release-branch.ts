import { execSync } from 'child_process'
import { config } from 'dotenv'

function main() {
  const branch = process.env.RELEASE_BRANCH!

  execSync(`git checkout -b "${branch}"`, { stdio: 'inherit' })
  console.log(`Created branch: ${branch}`)
}

if (require.main === module) {
  config()
  main()
}
