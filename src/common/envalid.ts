import { DotenvParseOutput, parse } from 'dotenv'
import { bool, cleanEnv, json, str } from 'envalid'
import { existsSync, readFileSync } from 'fs'

export const dotEnvParse = (path: string): DotenvParseOutput => {
  if (!existsSync(path)) {
    throw new Error(`${path} does not exist.`)
  }
  const buf = readFileSync(path)
    .toString()
    .replace(/export(\s+)/gi, '')

  const result = parse(buf)
  Object.entries(result).map(([k, v]) => {
    process.env[k] = v
    return v
  })
  return result
}

const cleanSpec = {
  CI: bool({ default: false }),
  ENV_DIR: str({ default: `${process.cwd()}/env` }),
  GCLOUD_SERVICE_KEY: json({ default: undefined }),
  KUBE_VERSION_OVERRIDE: str({ default: undefined }),
  OTOMI_DEV: bool({ default: false }),
  IN_DOCKER: bool({ default: false }),
  OTOMI_IN_TERMINAL: bool({ default: true }),
  STATIC_COLORS: bool({ default: false }),
  TESTING: bool({ default: false }),
  TRACE: bool({ default: false }),
  VALUES_INPUT: str({ desc: 'The chart values.yaml file', default: undefined }),
}

const path = `${process.env.ENV_DIR}/.secrets`
if (process.env.ENV_DIR && existsSync(path)) {
  dotEnvParse(path)
}
export const env = cleanEnv(process.env, cleanSpec)
