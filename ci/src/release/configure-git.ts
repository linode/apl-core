import { execSync } from 'child_process'
import { config } from 'dotenv'

config()

const email = process.env.BOT_EMAIL!
const username = process.env.BOT_USERNAME!

execSync(`git config --global user.email "${email}"`, { stdio: 'inherit' })
execSync(`git config --global user.name "${username}"`, { stdio: 'inherit' })
console.log(`Git identity configured: ${username} <${email}>`)
