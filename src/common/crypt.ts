import { EventEmitter } from 'events'
import { existsSync, statSync, utimesSync, writeFileSync } from 'fs'
import { $, cd, chalk, nothrow, ProcessOutput } from 'zx'
import { env } from './envalid'
import { BasicArguments, chunkArray, currDir, OtomiDebugger, readdirRecurse, terminal } from './utils'

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
  condition?: (path: string, file: string) => boolean
  cmd: CryptType
  post?: (result: ProcessOutput, path: string, file: string) => void
}

const processFileChunk = async (crypt: CR, files: string[]): Promise<ProcessOutput[]> => {
  const commands = files.map(async (file) => {
    if (!crypt.condition || crypt.condition(env.ENV_DIR, file)) {
      debug.debug(`${crypt.cmd} ${file}`)
      const result = await nothrow($`${crypt.cmd.split(' ')} ${file}`)
      if (crypt.post) crypt.post(result, env.ENV_DIR, file)
      return result
    }
    return undefined
  })
  const results = (await Promise.all(commands)).filter(Boolean) as ProcessOutput[]
  results.filter((res: ProcessOutput) => res.exitCode !== 0).map((val) => debug.warn(val))
  return results
}

const runOnSecretFiles = async (crypt: CR, filesArgs: string[] = []): Promise<ProcessOutput[] | undefined> => {
  const cwd = await currDir()
  let files: string[] = filesArgs
  cd(env.ENV_DIR)

  if (files.length === 0) {
    files = await getAllSecretFiles()
  }
  preCrypt()
  const chunkSize = 5
  const filesChunked = chunkArray(files, chunkSize)

  const eventEmitterDefaultListeners = EventEmitter.defaultMaxListeners
  // EventEmitter.defaultMaxListeners is 10, if we increate chunkSize in the future then this line will prevent it from crashing
  if (chunkSize + 2 > EventEmitter.defaultMaxListeners) EventEmitter.defaultMaxListeners = chunkSize + 2
  debug.debug(`runOnSecretFiles: ${crypt.cmd}`)
  try {
    const results: ProcessOutput[] = []
    // eslint-disable-next-line no-restricted-syntax
    for (const fileChunk of filesChunked) {
      // eslint-disable-next-line no-await-in-loop
      const chunkResult = await processFileChunk(crypt, fileChunk)
      results.push(...chunkResult)
    }
    return results
  } catch (error) {
    debug.error(error)
    return undefined
  } finally {
    cd(cwd)
    EventEmitter.defaultMaxListeners = eventEmitterDefaultListeners
  }
}

const matchTimestamps = (res: ProcessOutput, path: string, file: string) => {
  if (res.exitCode !== 0) return
  const absFilePath = `${path}/${file}`
  if (!existsSync(`${absFilePath}.dec`)) return

  const encTS = statSync(absFilePath)
  const decTS = statSync(`${absFilePath}.dec`)
  utimesSync(`${absFilePath}.dec`, decTS.mtime, encTS.mtime)
  const encSec = Math.round(encTS.mtimeMs / 1000)
  const decSec = Math.round(decTS.mtimeMs / 1000)
  debug.debug(`Updating timestamp for ${file}.dec from ${decSec} to ${encSec}`)
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
      post: (r, p, f) => {
        matchTimestamps(r, p, f)
      },
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
      condition: (path: string, file: string): boolean => {
        const absFilePath = `${path}/${file}`

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
      post: (r, p, f) => {
        debug.debug(r.stdout.trim())
        matchTimestamps(r, p, f)
      },
    },
    files,
  )

  debug.info('Encryption is done')
}

export const rotate = async (): Promise<void> => {
  const namespace = 'rotate'
  debug = terminal(namespace)
  if (!existsSync(`${env.ENV_DIR}/.sops.yaml`)) {
    debug.debug('Skipping rotation')
    return
  }
  await runOnSecretFiles({
    cmd: CryptType.ROTATE,
    post: (result: ProcessOutput, path: string, file: string) => {
      if (result.exitCode === 0) {
        debug.info(`Rotating sops key for '${chalk.italic(file)}' ${chalk.greenBright('succeeded')}`)
      } else {
        debug.warn(`Rotating sops key for '${chalk.italic(file)}' ${chalk.redBright('failed')}`)
      }
    },
  })
}
