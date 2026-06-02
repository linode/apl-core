import { validateVersion } from './version'

const version = process.env.VERSION ?? ''

if (!validateVersion(version)) {
  console.error(`Invalid version: "${version}". Expected format: 1.4.0 or 1.4.0-rc.1`)
  process.exit(1)
}

console.log(`Version "${version}" is valid`)
