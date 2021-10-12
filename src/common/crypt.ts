import { EventEmitter } from 'events'
import { existsSync, statSync, utimesSync, writeFileSync } from 'fs'
import { chunk } from 'lodash-es'
import { $, cd, ProcessOutput } from 'zx'
import { env } from './envalid'
import { BasicArguments, OtomiDebugger, readdirRecurse, rootDir, terminal } from './utils'

export interface Arguments extends BasicArguments {
  files?: string[]
}

EventEmitter.defaultMaxListeners = 20

let debug: OtomiDebugger

enum CryptType {
  ENCRYPT = 'helm secrets enc',
  DECRYPT = 'helm secrets dec',
  ROTATE = 'sops --input-type=yaml --output-type=yaml -i -r',
}

const preCrypt = (): void => {
  debug.debug('Checking prerequisites for the (de,en)crypt action')
  if (env.GCLOUD_SERVICE_KEY) {
    debug.debug('Writing GOOGLE_APPLICATION_CREDENTIAL')
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/key.json'
    writeFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, JSON.stringify(env.GCLOUD_SERVICE_KEY))
  }
  if (!env.CI) {
    const secretPath = `${env.ENV_DIR}/.secrets`
    if (!existsSync(secretPath)) {
      throw new Error(`Expecting ${secretPath} to exist and hold credentials for SOPS!`)
    }
  }
}

const getAllSecretFiles = async () => {
  const files = (await readdirRecurse(`${env.ENV_DIR}/env`, { skipHidden: true }))
    .filter((file) => file.endsWith('.yaml') && file.includes('/secrets.'))
    .map((file) => file.replace(`${env.ENV_DIR}/`, ''))
  // .filter((file) => existsSync(`${env.ENV_DIR}/${file}`))
  debug.debug('getAllSecretFiles: ', files)
  return files
}

type CR = {
  condition?: (file: string) => boolean
  cmd: CryptType
  post?: (file: string) => void
}

const processFileChunk = async (crypt: CR, files: string[]): Promise<(ProcessOutput | undefined)[]> => {
  const commands = files.map(async (file) => {
    if (!crypt.condition || crypt.condition(file)) {
      debug.debug(`${crypt.cmd} ${file}`)
      const result = $`${crypt.cmd.split(' ')} ${file}`
      return result.then((res) => {
        if (crypt.post) crypt.post(file)
        return res
      })
    }
    return undefined
  })
  return Promise.all(commands)
}

const runOnSecretFiles = async (crypt: CR, filesArgs: string[] = []): Promise<void> => {
  let files: string[] = filesArgs

  cd(env.ENV_DIR)

  if (files.length === 0) {
    files = await getAllSecretFiles()
  }
  preCrypt()
  const chunkSize = 5
  const filesChunked = chunk(files, chunkSize)

  const eventEmitterDefaultListeners = EventEmitter.defaultMaxListeners
  // EventEmitter.defaultMaxListeners is 10, if we increase chunkSize in the future then this line will prevent it from crashing
  if (chunkSize + 2 > EventEmitter.defaultMaxListeners) EventEmitter.defaultMaxListeners = chunkSize + 2
  debug.debug(`runOnSecretFiles: ${crypt.cmd}`)
  try {
    // eslint-disable-next-line no-restricted-syntax
    for (const fileChunk of filesChunked) {
      // eslint-disable-next-line no-await-in-loop
      await processFileChunk(crypt, fileChunk)
    }
    return
  } catch (error) {
    debug.error(error)
    throw error
  } finally {
    cd(rootDir)
    EventEmitter.defaultMaxListeners = eventEmitterDefaultListeners
  }
}

const matchTimestamps = (file: string) => {
  const absFilePath = `${env.ENV_DIR}/${file}`
  if (!existsSync(`${absFilePath}.dec`)) {
    debug.debug(`Missing ${file}.dec, skipping...`)
    return
  }

  const encTS = statSync(absFilePath)
  const decTS = statSync(`${absFilePath}.dec`)
  utimesSync(`${absFilePath}.dec`, decTS.mtime, encTS.mtime)
  const encSec = Math.round(encTS.mtimeMs / 1000)
  const decSec = Math.round(decTS.mtimeMs / 1000)
  debug.debug(`Updated timestamp for ${file}.dec from ${decSec} to ${encSec}`)
}

export const decrypt = async (...files: string[]): Promise<void> => {
  const namespace = 'decrypt'
  debug = terminal(namespace)
  if (!existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    debug.debug('Skipping decryption')
    return
  }
  debug.info('Starting decryption')

  await runOnSecretFiles(
    {
      cmd: CryptType.DECRYPT,
      post: matchTimestamps,
    },
    files,
  )

  debug.info('Decryption is done')
}

export const encrypt = async (...files: string[]): Promise<void> => {
  const namespace = 'encrypt'
  debug = terminal(namespace)
  if (!existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    debug.debug('Skipping encryption')
    return
  }
  debug.info('Starting encryption')
  await runOnSecretFiles(
    {
      condition: (file: string): boolean => {
        const absFilePath = `${env.ENV_DIR}/${file}`

        const decExists = existsSync(`${absFilePath}.dec`)
        if (!decExists) {
          debug.debug(`Did not find decrypted ${absFilePath}.dec`)
          return true
        }

        // if there is a .dec && .dec is > 1s newer
        debug.debug(`Found decrypted ${file}.dec`)

        const encTS = statSync(absFilePath)
        const decTS = statSync(`${absFilePath}.dec`)
        debug.debug('encTS.mtime: ', encTS.mtime)
        debug.debug('decTS.mtime: ', decTS.mtime)
        const timeDiff = Math.round((decTS.mtimeMs - encTS.mtimeMs) / 1000)
        if (timeDiff > 1) {
          debug.info(`Encrypting ${file}, time difference was ${timeDiff} seconds`)
          return true
        }
        debug.info(`Skipping encryption for ${file} as it has not changed`)
        return false
      },
      cmd: CryptType.ENCRYPT,
      post: matchTimestamps,
    },
    files,
  )

  debug.info('Encryption is done')
}
