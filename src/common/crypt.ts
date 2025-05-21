import { EventEmitter } from 'events'
import { pathExists } from 'fs-extra'
import { readFile, stat, utimes, writeFile } from 'fs/promises'
import { chunk } from 'lodash'
import { $, cd, ProcessOutput } from 'zx'
import { terminal } from './debug'
import { cleanEnv, cliEnvSpec, env, isCli } from './envalid'
import { filesAreDifferent, readdirRecurse, rootDir } from './utils'
import { BasicArguments } from './yargs'

export interface Arguments extends BasicArguments {
  files?: string[]
}

EventEmitter.defaultMaxListeners = 20

enum CryptType {
  ENCRYPT = 'helm secrets -q encrypt -i',
  DECRYPT = 'helm secrets decrypt',
  ROTATE = 'sops --input-type=yaml --output-type=yaml -i -r',
}

const preCrypt = async (path): Promise<void> => {
  const d = terminal(`common:crypt:preCrypt`)
  d.debug('Checking prerequisites for the (de,en)crypt action')
  // we might have set GCLOUD_SERVICE_KEY in bootstrap so reparse env
  // just this time (not desired as should be considered read only):
  const lateEnv = cleanEnv(cliEnvSpec)
  if (lateEnv.GCLOUD_SERVICE_KEY) {
    d.debug('Writing GOOGLE_APPLICATION_CREDENTIAL')
    // and set the location to the file holding the credentials for zx running sops
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/key.json'
    await writeFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, JSON.stringify(lateEnv.GCLOUD_SERVICE_KEY))
  }
  if (isCli) {
    const secretPath = `${path}/.secrets`
    if (!(await pathExists(secretPath))) {
      d.warn(`Expecting ${secretPath} to exist and hold credentials for SOPS. Not needed if already exists in env.`)
    }
  }
}

const getAllSecretFiles = async (path) => {
  const d = terminal(`common:crypt:getAllSecretFiles`)
  const files = (await readdirRecurse(`${path}/env`, { skipHidden: true })).filter(
    (file) => file.endsWith('.yaml') && file.includes('/secrets.'),
  )

  d.debug('getAllSecretFiles: ', files)
  return files
}

type CR = {
  condition?: (file: string) => Promise<boolean>
  cmd: CryptType
  post?: (file: string) => Promise<void>
}

const processFileChunk = async (crypt: CR, files: string[]): Promise<(ProcessOutput | undefined)[]> => {
  const d = terminal(`common:crypt:processFileChunk`)
  const commands = files.map(async (file) => {
    if (!crypt.condition || (await crypt.condition(file))) {
      d.debug(`${crypt.cmd} ${file}`)
      try {
        d.info(`${crypt.cmd} ${file}`)
        const result = await $`${[...crypt.cmd.split(' '), file]}`.quiet()

        if (crypt.cmd === CryptType.DECRYPT) {
          const outputFile = `${file}.dec`
          await writeFile(outputFile, result.stdout)
        }

        if (crypt.post) {
          await crypt.post(file)
        }

        return result
      } catch (error) {
        if (error.message.includes('Already encrypted') && (await pathExists(`${file}.dec`))) {
          const res = await $`helm secrets encrypt ${file}.dec`
          await writeFile(file, res.stdout)
          if (crypt.post) await crypt.post(file)
          return res
        } else {
          d.error(error.message)
        }
      }
    }
    return undefined
  })
  return Promise.all(commands)
}

const runOnSecretFiles = async (path: string, crypt: CR, filesArgs: string[] = []): Promise<void> => {
  const d = terminal(`common:crypt:runOnSecretFiles`)
  let files: string[] = filesArgs

  if (files.length === 0) {
    files = await getAllSecretFiles(path)
  }
  files = files.filter(async (f) => {
    const suffix = crypt.cmd === CryptType.ENCRYPT ? '.dec' : ''
    let file = `${f}${suffix}`
    // first time encryption might not have a .dec companion, so test existence first
    if (suffix && !(await pathExists(file))) file = f
    const content = await readFile(file, 'utf-8')
    return !!content
  })
  await preCrypt(path)
  const chunkSize = 5
  const filesChunked = chunk(files, chunkSize)

  const eventEmitterDefaultListeners = EventEmitter.defaultMaxListeners
  // EventEmitter.defaultMaxListeners is 10, if we increase chunkSize in the future then this line will prevent it from crashing
  if (chunkSize + 2 > EventEmitter.defaultMaxListeners) EventEmitter.defaultMaxListeners = chunkSize + 2
  d.debug(`runOnSecretFiles: ${crypt.cmd}`)
  try {
    for (const fileChunk of filesChunked) {
      await processFileChunk(crypt, fileChunk)
    }
    return
  } catch (error) {
    d.error(error)
    throw error
  } finally {
    cd(rootDir)
    EventEmitter.defaultMaxListeners = eventEmitterDefaultListeners
  }
}

const matchTimestamps = async (path, file: string) => {
  const d = terminal(`common:crypt:matchTimeStamps`)
  const absFilePath = `${path}/${file}`
  if (!(await pathExists(`${absFilePath}.dec`))) {
    d.debug(`Missing ${file}.dec, skipping...`)
    return
  }

  const encTS = await stat(absFilePath)
  const decTS = await stat(`${absFilePath}.dec`)
  await utimes(`${absFilePath}.dec`, decTS.mtime, encTS.mtime)
  const encSec = Math.round(encTS.mtimeMs / 1000)
  const decSec = Math.round(decTS.mtimeMs / 1000)
  d.debug(`Updated timestamp for ${file}.dec from ${decSec} to ${encSec}`)
}

export const decrypt = async (path = env.ENV_DIR, ...files: string[]): Promise<void> => {
  const d = terminal(`common:crypt:decrypt`)
  if (!(await pathExists(`${path}/.sops.yaml`))) {
    d.info('Skipping decryption')
    return
  }
  d.info('Starting decryption')

  await runOnSecretFiles(
    path,
    {
      cmd: CryptType.DECRYPT,
      post: async (f) => matchTimestamps(path, f),
    },
    files,
  )

  d.info('Decryption is done')
}

export const encrypt = async (path = env.ENV_DIR, ...files: string[]): Promise<void> => {
  const d = terminal(`common:crypt:encrypt`)
  if (!(await pathExists(`${path}/.sops.yaml`))) {
    d.info('Skipping encryption')
    return
  }
  d.info('Starting encryption')
  await runOnSecretFiles(
    path,
    {
      condition: async (file: string): Promise<boolean> => {
        if (!(await pathExists(file))) {
          d.warn(`${file} does not exist`)
          return false
        }

        try {
          // Same logic is used in helm-secrets: https://github.com/jkroepke/helm-secrets/blob/18a061430899c8cd66be68d8495f4b8489dbf3c3/scripts/lib/backends/sops.sh#L16
          await $`grep -q 'mac.*,type:str]' ${file}`
          d.info(`Skipping encryption for ${file} (already encrypted)`)
          return false
        } catch {
          d.debug(`${file} is not yet encrypted or grep did not match`)
        }
        // Check if the decrypted version exists
        const decExists = await pathExists(`${file}.dec`)
        if (!decExists) {
          d.debug(`Did not find decrypted ${file}.dec`)
          return true
        }

        // Compare timestamps
        const specsAreDifferent = await filesAreDifferent(file, d)
        if (specsAreDifferent) {
          d.info(`Encrypting ${file}, different from ${file}.dec`)
          return true
        }

        d.info(`Skipping encryption for ${file} as it has not changed`)
        return false
      },
      cmd: CryptType.ENCRYPT,
      post: async (f: string) => matchTimestamps(path, f),
    },
    files,
  )

  d.info('Encryption is done')
}
