import { EventEmitter } from 'events'
import { existsSync, writeFileSync } from 'fs'
import { $, cd, nothrow, ProcessOutput } from 'zx'
import { OtomiDebugger, terminal } from './debug'
import { BasicArguments, parser, readdirRecurse } from './no-deps'
import { evaluateSecrets } from './secrets'
import { env } from './validators'

EventEmitter.defaultMaxListeners = 20

let term: OtomiDebugger

enum CRYPT_TYPE {
  ENCRYPT = 'enc', // 'sops -e',
  DECRYPT = 'dec', // 'sops --input-type=yaml --output-type yaml -d $1',
}

const preCrypt = async (): Promise<void> => {
  term.verbose('Pre Crypt')
  await evaluateSecrets()
  if (env.GCLOUD_SERVICE_KEY) {
    term.verbose('Writing GOOGLE_APPLICATION_CREDENTIAL')
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/key.json'
    writeFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, JSON.stringify(env.GCLOUD_SERVICE_KEY, null, 2))
  }
}

const postCrypt = (): void => {
  term.verbose('Post Crypt')
  process.env.GOOGLE_APPLICATION_CREDENTIALS = undefined
}

const runOnSecretFiles = async (cmd: string[], filesArgs?: string[]): Promise<ProcessOutput[] | undefined> => {
  const currDir = process.cwd()
  let files: string[] = filesArgs ?? []
  cd(`${env.ENV_DIR}`)

  if (files.length === 0) {
    files = await readdirRecurse(`${env.ENV_DIR}/env`)
    files = files
      .filter((file) => file.endsWith('.yaml') && file.includes('/secrets.'))
      .map((file) => file.replace(env.ENV_DIR, '.'))
    files = files.filter((file) => existsSync(`${env.ENV_DIR}/${file}`))
  }
  await preCrypt()

  const eventEmitterDefaultListeners = EventEmitter.defaultMaxListeners
  EventEmitter.defaultMaxListeners = files.length + 5
  try {
    const commands = files.map(async (file) => nothrow($`${cmd} ${file}`))
    const results = await Promise.all(commands)
    results.filter((res) => res.exitCode !== 0).map((val) => term.warn(val))
    return results
  } catch (error) {
    term.error(error)
    return undefined
  } finally {
    cd(currDir)
    postCrypt()
    EventEmitter.defaultMaxListeners = eventEmitterDefaultListeners
  }
}

const crypt = async (type: CRYPT_TYPE, ...files: string[]): Promise<ProcessOutput[] | void> => {
  const helmArgs = ['helm', 'secrets', type]
  const res = (await runOnSecretFiles(helmArgs, files))?.map((result) => result.stdout.trim())
  term.verbose(`Running crypt type ${type}`)
  res?.map((result) => term.debug(result))
}

export const decrypt = async (...files: string[]): Promise<void> => {
  const namespace = 'decrypt'
  term = terminal(namespace)
  await crypt(CRYPT_TYPE.DECRYPT, ...files)
}
export const encrypt = async (...files: string[]): Promise<void> => {
  const namespace = 'encrypt'
  term = terminal(namespace)
  await crypt(CRYPT_TYPE.ENCRYPT, ...files)
}

export const rotate = async (): Promise<void> => {
  const namespace = 'rotate'
  term = terminal(namespace)
  const verboseArg = (parser.argv as BasicArguments).verbose >= 1 ? ['--verbose'] : []
  const sopsArgs = ['sops', ...verboseArg, '--input-type=yaml', '--output-type=yaml', '-i', '-r']

  const res = (await runOnSecretFiles(sopsArgs))?.map((result) => result.stderr)
  if (verboseArg.length > 0) res?.map((result) => term.verbose(result))
}
