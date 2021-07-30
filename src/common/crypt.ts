import { EventEmitter } from 'events'
import { existsSync, statSync, utimesSync, writeFileSync } from 'fs'
import { $, cd, chalk, nothrow, ProcessOutput } from 'zx'
import { OtomiDebugger, terminal } from './debug'
import { env, getEnv } from './envalid'
import { evaluateSecrets } from './secrets'
import { currDir, readdirRecurse } from './utils'

EventEmitter.defaultMaxListeners = 20

let debug: OtomiDebugger

enum CryptType {
  ENCRYPT = 'helm secrets enc',
  DECRYPT = 'helm secrets dec',
  ROTATE = 'sops --input-type=yaml --output-type=yaml -i -r',
}

const preCrypt = async (): Promise<void> => {
  debug.info('Checking prerequisites for the (de,en)crypt action')
  await evaluateSecrets()
  const secretEnv = getEnv()
  if (secretEnv.GCLOUD_SERVICE_KEY) {
    debug.debug('Writing GOOGLE_APPLICATION_CREDENTIAL')
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/key.json'
    writeFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, JSON.stringify(secretEnv.GCLOUD_SERVICE_KEY, null, 2))
  }
}

const getAllSecretFiles = async () => {
  const files = await readdirRecurse(env.ENV_DIR, { skipHidden: true })
  return files
    .filter((file) => file.endsWith('.yaml') && file.includes('/secrets.'))
    .map((file) => file.replace(env.ENV_DIR, '.'))
    .filter((file) => existsSync(`${env.ENV_DIR}/${file}`))
}

type CR = {
  condition?: (path: string, file: string) => boolean
  cmd: CryptType
  post?: (result: ProcessOutput, path: string, file: string) => void
}

const runOnSecretFiles = async (crypt: CR, filesArgs: string[] = []): Promise<ProcessOutput[] | undefined> => {
  const currDirVal = await currDir()
  let files: string[] = filesArgs
  cd(env.ENV_DIR)

  if (files.length === 0) {
    files = await getAllSecretFiles()
  }
  await preCrypt()
  const eventEmitterDefaultListeners = EventEmitter.defaultMaxListeners
  EventEmitter.defaultMaxListeners = files.length + 5
  try {
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
  } catch (error) {
    debug.error(error)
    return undefined
  } finally {
    cd(currDirVal)
    EventEmitter.defaultMaxListeners = eventEmitterDefaultListeners
  }
}

const matchTimestamps = (res: ProcessOutput, path: string, file: string) => {
  if (res.exitCode !== 0) return
  const absFilePath = `${path}/${file}`
  if (!existsSync(`${absFilePath}.dec`)) return

  const encTS = statSync(absFilePath)
  const decTS = statSync(`${absFilePath}.dec`)
  utimesSync(`${absFilePath}.dec`, decTS.atime, encTS.mtime)
  const encSec = Math.round(encTS.mtimeMs / 1000)
  const decSec = Math.round(decTS.mtimeMs / 1000)
  debug.debug(`Updating timestamp for ${absFilePath}.dec from ${decSec} to ${encSec}`)
}

export const decrypt = async (...files: string[]): Promise<void> => {
  const namespace = 'decrypt'
  debug = terminal(namespace)
  debug.info('Starting decryption')

  await runOnSecretFiles(
    {
      cmd: CryptType.DECRYPT,
      post: (r, p, f) => {
        debug.debug(r.stdout.trim())
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
  debug.info('Starting encryption')
  let encFiles = files

  if (encFiles.length === 0) encFiles = await getAllSecretFiles()
  await runOnSecretFiles(
    {
      condition: (path: string, file: string): boolean => {
        const absFilePath = `${path}/${file}`

        const encExists = existsSync(absFilePath)
        const decExists = existsSync(`${absFilePath}.dec`)
        if (encExists !== decExists) return true
        if (!encExists || !decExists) return false

        // if there is a .dec && .dec is > 1s newer
        debug.debug(`Found decrypted ${file}.dec`)

        const encTS = statSync(absFilePath)
        const decTS = statSync(`${absFilePath}.dec`)

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
