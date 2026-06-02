import { validateMinorVersion } from './version'

const minorVersion = process.env.MINOR_VERSION ?? ''

if (!validateMinorVersion(minorVersion)) {
  console.error(`Invalid minor version: "${minorVersion}". Expected format: 1.4`)
  process.exit(1)
}

console.log(`Minor version "${minorVersion}" is valid`)
