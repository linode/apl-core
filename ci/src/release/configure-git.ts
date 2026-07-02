import { execSync } from 'child_process'
import { config } from 'dotenv'

function main() {
  const email = process.env.BOT_EMAIL!
  const username = process.env.BOT_USERNAME!

  execSync(`git config --global user.email "${email}"`, { stdio: 'inherit' })
  execSync(`git config --global user.name "${username}"`, { stdio: 'inherit' })
  console.log(`Git identity configured.`)
}

if (require.main === module) {
  config()
  main()
}
