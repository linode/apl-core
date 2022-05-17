import { EventEmitter } from 'events'
import { existsSync, readFileSync, statSync, utimesSync, writeFileSync } from 'fs'
import { chunk } from 'lodash'
import { $, cd, ProcessOutput } from 'zx'
import { terminal } from './debug'
import { cleanEnvironment, env, isCli } from './envalid'
import { readdirRecurse, rootDir } from './utils'
import { BasicArguments } from './yargs'

export interface Arguments extends BasicArguments {
  files?: string[]
}

EventEmitter.defaultMaxListeners = 20

enum CryptType {
  ENCRYPT = 'helm secrets enc',
  DECRYPT = 'helm secrets dec',
  ROTATE = 'sops --input-type=yaml --output-type=yaml -i -r',
}

const preCrypt = (): void => {
  const d = terminal(`common:crypt:preCrypt`)
  d.debug('Checking prerequisites for the (de,en)crypt action')
  // we might have set GCLOUD_SERVICE_KEY in bootstrap so reparse env
  // just this time (not desired as should be considered read only):
  const lateEnv = cleanEnvironment()
  if (lateEnv.GCLOUD_SERVICE_KEY) {
    d.debug('Writing GOOGLE_APPLICATION_CREDENTIAL')
    // and set the location to the file holding the credentials for zx running sops
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/key.json'
    writeFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, JSON.stringify(lateEnv.GCLOUD_SERVICE_KEY))
  }
  if (isCli) {
    const secretPath = `${env.ENV_DIR}/.secrets`
    if (!existsSync(secretPath)) {
      d.warn(`Expecting ${secretPath} to exist and hold credentials for SOPS. Not needed if already exists in env.`)
    }
  }
}

const getAllSecretFiles = async () => {
  const d = terminal(`common:crypt:getAllSecretFiles`)
  const files = (await readdirRecurse(`${env.ENV_DIR}/env`, { skipHidden: true }))
    .filter((file) => file.endsWith('.yaml') && file.includes('/secrets.'))
    .map((file) => file.replace(`${env.ENV_DIR}/`, ''))
  // .filter((file) => existsSync(`${env.ENV_DIR}/${file}`))
  d.debug('getAllSecretFiles: ', files)
  return files
}

type CR = {
  condition?: (file: string) => boolean
  cmd: CryptType
  post?: (file: string) => void
}

const processFileChunk = async (crypt: CR, files: string[]): Promise<(ProcessOutput | undefined)[]> => {
  const d = terminal(`common:crypt:processFileChunk`)
  const commands = files.map(async (file) => {
    if (!crypt.condition || crypt.condition(file)) {
      d.debug(`${crypt.cmd} ${file}`)
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
  const d = terminal(`common:crypt:runOnSecretFiles`)
  let files: string[] = filesArgs

  cd(env.ENV_DIR)

  if (files.length === 0) {
    files = await getAllSecretFiles()
  }
  files = files.filter((f) => {
    const suffix = crypt.cmd === CryptType.ENCRYPT ? '.dec' : ''
    let file = `${f}${suffix}`
    // first time encryption might not have a .dec companion, so test existence first
    if (suffix && !existsSync(file)) file = f
    const content = readFileSync(file, 'utf-8')
    return !!content
  })
  preCrypt()
  const chunkSize = 5
  const filesChunked = chunk(files, chunkSize)

  const eventEmitterDefaultListeners = EventEmitter.defaultMaxListeners
  // EventEmitter.defaultMaxListeners is 10, if we increase chunkSize in the future then this line will prevent it from crashing
  if (chunkSize + 2 > EventEmitter.defaultMaxListeners) EventEmitter.defaultMaxListeners = chunkSize + 2
  d.debug(`runOnSecretFiles: ${crypt.cmd}`)
  try {
    // eslint-disable-next-line no-restricted-syntax
    for (const fileChunk of filesChunked) {
      // eslint-disable-next-line no-await-in-loop
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

const matchTimestamps = (file: string) => {
  const d = terminal(`common:crypt:matchTimeStamps`)
  const absFilePath = `${env.ENV_DIR}/${file}`
  if (!existsSync(`${absFilePath}.dec`)) {
    d.debug(`Missing ${file}.dec, skipping...`)
    return
  }

  const encTS = statSync(absFilePath)
  const decTS = statSync(`${absFilePath}.dec`)
  utimesSync(`${absFilePath}.dec`, decTS.mtime, encTS.mtime)
  const encSec = Math.round(encTS.mtimeMs / 1000)
  const decSec = Math.round(decTS.mtimeMs / 1000)
  d.debug(`Updated timestamp for ${file}.dec from ${decSec} to ${encSec}`)
}

export const decrypt = async (...files: string[]): Promise<void> => {
  const d = terminal(`common:crypt:decrypt`)
  if (!existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    d.info('Skipping decryption')
    return
  }
  d.info('Starting decryption')

  await runOnSecretFiles(
    {
      cmd: CryptType.DECRYPT,
      post: matchTimestamps,
    },
    files,
  )

  d.info('Decryption is done')
}

export const encrypt = async (...files: string[]): Promise<void> => {
  const d = terminal(`common:crypt:encrypt`)
  if (!existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    d.info('Skipping encryption')
    return
  }
  d.info('Starting encryption')
  await runOnSecretFiles(
    {
      condition: (file: string): boolean => {
        const absFilePath = `${env.ENV_DIR}/${file}`

        const decExists = existsSync(`${absFilePath}.dec`)
        if (!decExists) {
          d.debug(`Did not find decrypted ${absFilePath}.dec`)
          return true
        }

        // if there is a .dec && .dec is > 1s newer
        d.debug(`Found decrypted ${file}.dec`)

        const encTS = statSync(absFilePath)
        const decTS = statSync(`${absFilePath}.dec`)
        d.debug('encTS.mtime: ', encTS.mtime)
        d.debug('decTS.mtime: ', decTS.mtime)
        const timeDiff = Math.round((decTS.mtimeMs - encTS.mtimeMs) / 1000)
        if (timeDiff > 1) {
          d.info(`Encrypting ${file}, time difference was ${timeDiff} seconds`)
          return true
        }
        d.info(`Skipping encryption for ${file} as it has not changed`)
        return false
      },
      cmd: CryptType.ENCRYPT,
      post: matchTimestamps,
    },
    files,
  )

  d.info('Encryption is done')
}
