import { config } from 'dotenv'
import { bool, cleanEnv, json, makeValidator, num, str } from 'envalid'
import { existsSync } from 'fs'

const ciBool = makeValidator((x) => {
  if (x === 'vscode-jest-tests') return true
  if (x === undefined) return undefined
  const { _parse } = bool({ default: false })
  return _parse(x)
})

const cliEnvSpec = {
  CI: ciBool({ default: false }),
  DEPLOYMENT_NAMESPACE: str({ default: 'default' }),
  ENV_DIR: str({ default: `${process.cwd()}/env` }),
  GCLOUD_SERVICE_KEY: json({ default: undefined }),
  IN_DOCKER: bool({ default: false }),
  KUBE_VERSION_OVERRIDE: str({ default: undefined }),
  NODE_TLS_REJECT_UNAUTHORIZED: bool({ default: true }),
  OTOMI_DEV: bool({ default: false }),
  OTOMI_IN_TERMINAL: bool({ default: true }),
  STATIC_COLORS: bool({ default: false }),
  TESTING: bool({ default: false }),
  TRACE: bool({ default: false }),
  VERBOSITY: num({ desc: 'The verbosity level', default: 1 }),
  VALUES_INPUT: str({ desc: 'The chart values.yaml file', default: undefined }),
}

export const cleanEnvironment = (
  spec: Record<string, any> = cliEnvSpec,
  returnFunc = false,
): Record<string, any> | CallableFunction => {
  const func = (): Record<string, any> => {
    let pEnv: any = process.env
    // load local .env if we have it, for devs
    let path = `${process.cwd()}/.env`
    if (!process.env.TESTING && existsSync(path)) {
      const result = config({ path })
      if (result.error) console.error(result.error)
      pEnv = { ...pEnv, ...result.parsed }
    }
    path = `${pEnv.ENV_DIR}/.secrets`
    if (existsSync(path)) {
      const result = config({ path })
      if (result.error) console.error(result.error)
      pEnv = { ...pEnv, ...result.parsed }
    }
    return cleanEnv(pEnv, spec)
  }
  return returnFunc ? func : func()
}

let _env
export const env = (): Record<string, any> => {
  if (_env) return _env
  _env = cleanEnvironment()
  return _env
}

export const isChart: boolean = env().CI && !!env().VALUES_INPUT
export const isCli: boolean = !env().CI && !isChart
