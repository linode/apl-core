#!/usr/bin/env zx

import { Glob } from "glob";
import fs from 'fs/promises'
import yaml from 'js-yaml'
import envalid, { str } from "envalid";


function createSealedSecret(oldSecret) {
  const { name, namespace, secretType, immutable, encryptedData } = oldSecret
  const metadata = oldSecret.metadata || {}
  metadata.annotations = metadata.annotations || {}
  metadata.annotations['sealedsecrets.bitnami.com/namespace-wide'] = "true"
  metadata.name = name
  metadata.namespace = namespace
  return {
    "apiVersion": "bitnami.com/v1alpha1",
    "kind": "SealedSecret",
    "metadata": metadata,
    "spec": {
      "encryptedData": encryptedData,
      "template": {
        "immutable": immutable || false,
        "metadata": {
          "name": name,
          "namespace": namespace,
        },
        "type": secretType,
      }
    }
  }
}


async function readSecretFile(filename) {
  const secretYaml = await fs.readFile(filename, 'utf8')
  return yaml.load(secretYaml)
}


async function writeSecretFile(filename, secret) {
  const secretYaml = yaml.dump(secret)
  await fs.writeFile(filename, secretYaml, 'utf8')
}


async function main() {
  console.log('Migrating secret files')
  const env = envalid.cleanEnv(process.env, {
    ENV_DIR: str({desc: 'Values store'}),
  })

  const secretFiles = new Glob(`${env.ENV_DIR}/env/teams/sealedsecrets.*.yaml`, {})
  for await (const secretFile of secretFiles) {
    console.log('Migrating secret from', secretFile)
    const oldSecretFile = await readSecretFile(secretFile)
    // Team values are wrapped in teamConfig.<teamName>.sealedsecrets
    await Promise.all(
      Object.entries(oldSecretFile.teamConfig).map(async ([teamName, teamValues]) => {
        const teamSecretList = teamValues.sealedsecrets
        if (teamSecretList) {
          for (const oldSecret of teamSecretList) {
            const secretId = oldSecret.id
            const dirName = `${env.ENV_DIR}/env/teams/${teamName}`
            await fs.mkdir(dirName, { recursive: true })
            const sealedSecretFilename = `${dirName}/${secretId}.yaml`
            const sealedSecret = createSealedSecret(oldSecret)
            console.log(`Writing migrated secret in ${sealedSecretFilename}`)
            await writeSecretFile(sealedSecretFilename, sealedSecret)
          }
          console.log(`Completed migration of secrets in ${secretFile}.`)
        } else {
          console.log(`No secrets found to migrate in ${secretFile}.`)
        }
      })
    )
    console.log(`Cleaning up ${secretFile}.`)
    await fs.rm(secretFile)
  }
  console.log('Finished migrating secret files')
}
await main()
