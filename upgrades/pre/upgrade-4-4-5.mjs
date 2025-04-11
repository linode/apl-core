#!/usr/bin/env zx

import fs from 'fs/promises'
import yaml from 'js-yaml'
import envalid, { str } from "envalid";

async function readFile(filename) {
  const content = await fs.readFile(filename, 'utf8')
  return yaml.load(content)
}


async function writeFile(filename, settings) {
  const content = yaml.dump(settings, { indent: 4 });
  await fs.writeFile(filename, content,  'utf8')
}


async function main() {
  console.log('Migrating resource quota values')
  const env = envalid.cleanEnv(process.env, {
    ENV_DIR: str({desc: 'Values store'}),
  })

  const settingsFile = `${env.ENV_DIR}/env/teams.yaml`
  const settings = await readFile(settingsFile)
  Object.entries(settings.teamConfig).forEach(([teamName, teamValues]) => {
    if (teamValues?.resourceQuota !== undefined && !Array.isArray(teamValues?.resourceQuota)) {
      teamValues.resourceQuota = Object.entries(teamValues?.resourceQuota || {}).map(([name, value]) => ({ name, value }))
      console.log('Completed migration of settings for team', teamName)
    } else {
      console.log('No migration needed of settings for team', teamName)
    }
  })
  console.log('Storing migrated settings in', settingsFile)
  await writeFile(settingsFile, settings)
  console.log('Finished migrating resource quota values.')
}
await main()
