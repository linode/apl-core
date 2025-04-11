#!/usr/bin/env zx

import { Glob } from "glob";
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

  const settingsFiles = new Glob(`${env.ENV_DIR}/env/teams/*/settings.yaml`, {})
  for await (const settingsFile of settingsFiles) {
    console.log('Migrating settings from', settingsFile)
    const settings = await readFile(settingsFile)
    if (!Array.isArray(settings.spec?.resourceQuota)) {
      settings.spec.resourceQuota = Object.entries(settings.spec?.resourceQuota || {}).map(([name, value]) => ({ name, value }))
      await writeFile(settingsFile, settings)
      console.log('Completed migration of settings in', settingsFile)
    } else {
      console.log('No migration needed of settings in', settingsFile)
    }
  }
  console.log('Finished migrating resource quota values.')
}
await main()
