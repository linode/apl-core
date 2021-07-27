import { bool, cleanEnv, json, makeValidator, str } from 'envalid'
import { existsSync, lstatSync } from 'fs'

const envalidPath = makeValidator((x) => {
  if (existsSync(x) && lstatSync(x).isDirectory()) return x
  throw new Error('Expected a valid path')
})

export const env = cleanEnv(process.env, {
  CI: bool({ default: false }),
  ENV_DIR: envalidPath({ default: process.cwd() }),
  GCLOUD_SERVICE_KEY: json({ default: undefined }),
  KUBE_VERSION_OVERRIDE: str({ default: undefined }),
  OTOMI_DEV: bool({ default: false }),
  OTOMI_IN_DOCKER: bool({ default: false }),
  OTOMI_IN_TERMINAL: bool({ default: true }),
  STATIC_COLORS: bool({ default: false }),
  TESTING: bool({ default: false }),
  TRACE: bool({ default: false }),
})
export default env
