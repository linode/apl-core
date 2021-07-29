import { EventEmitter } from 'events'
import { existsSync, statSync, utimesSync, writeFileSync } from 'fs'
import { $, cd, nothrow, ProcessOutput } from 'zx'
import { OtomiDebugger, terminal } from './debug'
import { env, getEnv } from './envalid'
import { currDir, readdirRecurse } from './no-deps'
import { evaluateSecrets } from './secrets'

EventEmitter.defaultMaxListeners = 20

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates
type cryptType = (...values: any) => string
const tmpl = (strings: any, ...keys: (string | number)[]): cryptType => {
  return (...values: [any]) => {
    const dict = values[values.length - 1] || {}
    const result = [strings[0]]
    keys.forEach(function (key, i) {
      const value = Number.isInteger(key) ? values[key] : dict[key]
      result.push(value, strings[i + 1])
    })
    return result.join('')
  }
}

let debug: OtomiDebugger
const encryptCmd = tmpl`helm secrets enc ${'file'}`
const decryptCmd = tmpl`helm secrets dec ${'file'}`
const rotateCmd = tmpl`sops --input-type=yaml --output-type=yaml -i -r ${'file'}`

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
  const files = await readdirRecurse(`${env.ENV_DIR}/env`)
  return files
    .filter((file) => file.endsWith('.yaml') && file.includes('/secrets.'))
    .map((file) => file.replace(env.ENV_DIR, '.'))
    .filter((file) => existsSync(`${env.ENV_DIR}/${file}`))
}

const runOnSecretFiles = async (
  func: (file: string) => Promise<ProcessOutput | undefined>,
  filesArgs: string[] = [],
): Promise<ProcessOutput[] | undefined> => {
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
    const commands = files.map(async (file) => func(file))
    const results = await Promise.all(commands)
    return results
      .filter(Boolean)
      .filter((res: ProcessOutput) => res.exitCode !== 0)
      .map((val) => {
        debug.warn(val)
        return val
      }) as ProcessOutput[]
  } catch (error) {
    debug.error(error)
    return undefined
  } finally {
    cd(currDirVal)
    EventEmitter.defaultMaxListeners = eventEmitterDefaultListeners
  }
}

const crypt = async (
  cryptCmd: (file: string) => Promise<ProcessOutput | undefined>,
  ...files: string[]
): Promise<ProcessOutput[] | undefined> => {
  const processOutput = await runOnSecretFiles(cryptCmd, files)
  const res = processOutput?.map((result) => result.stdout.trim())
  res?.map((result) => debug.debug(result))
  return processOutput
}

const matchTimestamps = async (files: string[]) => {
  const path = await currDir()
  files
    .filter((file) => existsSync(`${path}/${file}.dec`))
    .map((file) => {
      const absFilePath = `${path}/${file}`
      const encTS = statSync(absFilePath)
      const decTS = statSync(`${absFilePath}.dec`)
      utimesSync(`${absFilePath}.dec`, decTS.atime, encTS.mtime)
      debug.debug(`Updating timestamp for ${absFilePath}.dec from ${decTS.mtime} to ${encTS.mtime}`)
      return file
    })
}

export const decrypt = async (...files: string[]): Promise<void> => {
  const namespace = 'decrypt'
  debug = terminal(namespace)
  debug.info('Starting decryption')

  const singleFileDec = async (file: string) => {
    const path = await currDir()
    const absFilePath = `${path}/${file}`

    const res = await nothrow($`${decryptCmd({ file }).split(' ')}`)
    if (res.exitCode === 0) matchTimestamps([absFilePath])
    return res
  }

  await crypt(singleFileDec, ...files)

  debug.info('Decryption is done')
}
export const encrypt = async (...files: string[]): Promise<void> => {
  const namespace = 'encrypt'
  debug = terminal(namespace)
  debug.info('Starting encryption')
  let encFiles = files

  if (encFiles.length === 0) encFiles = await getAllSecretFiles()

  const singleFileEnc = async (file: string): Promise<ProcessOutput | undefined> => {
    const path = await currDir()
    const absFilePath = `${path}/${file}`

    const toEncrypt = (): boolean => {
      const encExists = existsSync(absFilePath)
      const decExists = existsSync(`${absFilePath}.dec`)
      if (encExists && !decExists) return true

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
    }
    if (toEncrypt()) {
      const res = await nothrow($`${encryptCmd({ file }).split(' ')}`)
      if (res.exitCode === 0) matchTimestamps([absFilePath])
      return res
    }
    return undefined
  }
  await crypt(singleFileEnc, ...encFiles)
  debug.info('Encryption is done')
}

export const rotate = async (): Promise<void> => {
  const namespace = 'rotate'
  debug = terminal(namespace)
  const res = (await runOnSecretFiles((file) => nothrow($`${rotateCmd({ file }).split(' ')}`)))?.map(
    (result) => result.stderr,
  )
  res?.map((result) => debug.info(result))
}
