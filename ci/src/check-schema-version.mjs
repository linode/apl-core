#!/usr/bin/env zx

import fs from 'fs/promises'
import yaml from 'js-yaml'

const VALUES_CHANGES_PATH = '../values-changes.yaml'
const DEFAULTS_PATH = '../helmfile.d/snippets/defaults.yaml'
const TESTS_SCHEMA_PATH = '../tests/fixtures/env/settings/versions.yaml'

async function loadYamlFile(fileName) {
  const yamlContent = await fs.readFile(fileName, 'utf8')
  return yaml.load(yamlContent)
}

async function checkValuesChanges() {
  const valuesChanges = await loadYamlFile(VALUES_CHANGES_PATH)
  const uniqueVersions = new Set()
  for (const change of valuesChanges.changes) {
    if (uniqueVersions.has(change.version)) {
      throw new Error(`Duplicate schema version found: ${change.version}`)
    }
    if (uniqueVersions.size > 0 && !uniqueVersions.has(change.version - 1)) {
      throw new Error(`Schema version ${change.version} exists, but not ${change.version - 1}. Please check version sequence.`)
    }
    uniqueVersions.add(change.version)
  }
  return Math.max.apply(null, Array.from(uniqueVersions))
}

async function checkDefaultsVersion(latestVersion) {
  const defaults = await loadYamlFile(DEFAULTS_PATH)
  const defaultsVersion = defaults.environments.default.values[0].versions.specVersion
  if (defaultsVersion !== latestVersion) {
    throw new Error(`Spec version in values defaults ${defaultsVersion} does not match. Please adjust.`)
  }
}

async function checkTestFixtureVersion(latestVersion) {
  const manifest = await loadYamlFile(TESTS_SCHEMA_PATH)
  const specVersion = manifest.spec.specVersion
  if (specVersion !== latestVersion) {
    throw new Error(`Spec version of test fixtures ${specVersion} does not match. Please run 'otomi migrate'.`)
  }
}

async function main() {
  console.log("Checking schema versions")
  const latestVersion = await checkValuesChanges()
  console.log("Latest schema version from values changes: ", latestVersion)
  await checkDefaultsVersion(latestVersion)
  await checkTestFixtureVersion(latestVersion)
  console.log("Schema versions checked.")
}

await main()
