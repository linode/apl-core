import { EventEmitter } from 'events'
import { pathExists } from 'fs-extra'
import { readFile, stat, utimes, writeFile } from 'fs/promises'
import { chunk } from 'lodash'
import { $, cd, ProcessOutput } from 'zx'
import { terminal } from './debug'
import { cleanEnv, cliEnvSpec, env, isCli } from './envalid'
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

export const getAllSecretFiles = (relativePaths: Array<string>, encryption: boolean, suffix: string) => {
  /** Use cases
   * 1. encryption for the first time when .dec does not exists
   * 2. encryption after bootstraping files, so they also do not have .dec
   * 3. encryption of files with .dec
   * 4. decryption of secrets.*.yaml files
   */

  const d = terminal(`common:crypt:getAllSecretFiles`)
  let filteredFiles: Array<string> = []
  const encryptedFiles = relativePaths.filter((file) => file.endsWith(`.yaml`) && file.includes('/secrets.'))

  if (encryption) {
    const decryptedFiles = relativePaths.filter((file) => file.endsWith(suffix) && file.includes('/secrets.'))

    filteredFiles = encryptedFiles.map((file) => {
      // If a secret.*.yaml.dec does not exists then return secret.*.yaml
      if (relativePaths.includes(`${file}${suffix}`)) return `${file}${suffix}`
      return file
    })
    filteredFiles = filteredFiles.concat(decryptedFiles)
    filteredFiles = [...new Set(filteredFiles)]
  } else {
    filteredFiles = encryptedFiles
  }

  d.debug('getAllSecretFiles: ', filteredFiles)
  return filteredFiles
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
      const result = $`${crypt.cmd.split(' ')} ${file}`
      return result.then(async (res) => {
        if (crypt.post) await crypt.post(file)
        return res
      })
    }
    return undefined
  })
  return Promise.all(commands)
}

const runOnSecretFiles = async (path: string, crypt: CR, filesArgs: string[] = []): Promise<void> => {
  /** Use cases
   * 1. encryption for the first time when .dec does not exists
   * 2. encryption after bootstraping files, so they also do not have .dec
   * 3. encryption of files with .dec
   * 4. decryption of secrets.*.yaml files
   */
  const d = terminal(`common:crypt:runOnSecretFiles`)
  let files: string[] = filesArgs
  let suffix = ''
  let encryption = false
  if (crypt.cmd === CryptType.ENCRYPT) {
    suffix = '.dec'
    encryption = false
  }

  cd(path)

  if (files.length === 0) {
    const allFiles = await readdirRecurse(`${path}/env`, { skipHidden: true })
    const allRelativePaths = allFiles.map((file) => file.replace(`${path}/`, ''))
    files = getAllSecretFiles(allRelativePaths, encryption, suffix)
  }
  files = files.filter(async (f) => {
    const content = await readFile(f, 'utf-8')
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
        const absFilePath = `${path}/${file}`

        const decExists = await pathExists(`${absFilePath}.dec`)
        if (!decExists) {
          d.debug(`Did not find decrypted ${absFilePath}.dec`)
          return true
        }

        // if there is a .dec && .dec is > 1s newer
        d.debug(`Found decrypted ${file}.dec`)

        const encTS = await stat(absFilePath)
        const decTS = await stat(`${absFilePath}.dec`)
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
      post: async (f: string) => matchTimestamps(path, f),
    },
    files,
  )

  d.info('Encryption is done')
}
