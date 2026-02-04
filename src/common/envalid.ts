import { config } from 'dotenv'
import { bool, cleanEnv as clean, CleanOptions, json, makeValidator, num, str, ValidatorSpec } from 'envalid'
import { existsSync } from 'fs'

const ciBool = makeValidator<boolean | undefined>((x) => {
  if (x === 'vscode-jest-tests') return true
  if (x === undefined) return undefined
  const { _parse } = bool({ default: false })
  return _parse(x)
})

export const cliEnvSpec = {
  CI: ciBool({ default: false }),
  DISABLE_SYNC: bool({ default: false, desc: 'will disable contacting the cluster as found in kube context' }),
  ENV_DIR: str({ default: `${process.cwd()}/env` }),
  SOPS_AGE_KEY: str({ default: '' }),
  GCLOUD_SERVICE_KEY: json({ default: undefined }),
  IN_DOCKER: bool({ default: false }),
  KUBE_VERSION_OVERRIDE: str({ default: undefined }),
  NODE_TLS_REJECT_UNAUTHORIZED: bool({ default: true }),
  OTOMI_DEV: bool({ default: false }),
  OTOMI_IN_TERMINAL: bool({ default: true }),
  STATIC_COLORS: bool({ default: false }),
  TRACE: bool({ default: false }),
  VERBOSITY: num({ desc: 'The verbosity level', default: 1 }),
  VALUES_INPUT: str({ desc: 'The chart values.yaml file', default: undefined }),
  RETRIES: num({ desc: 'The maximum amount of times to retry the operation by the reconciler', default: 60 }),
  RANDOM: bool({ desc: 'Randomizes the timeouts by multiplying with a factor between 1 to 2', default: false }),
  MIN_TIMEOUT: num({ desc: 'The number of milliseconds before starting the first retry', default: 30000 }),
  FACTOR: num({ desc: 'The factor to multiply the timeout with', default: 1 }),
  INSTALL_RETRIES: num({
    desc: 'The maximum amount of times to retry the installation on failure (within a single job)',
    default: 3,
  }),
  INSTALL_RETRY_TIMEOUT: num({
    desc: 'The number of milliseconds before starting an installation retry',
    default: 30000,
  }),
  INSTALL_STEP_RETRIES: num({
    desc: 'The maximum amount of times to retry single post-installation steps',
    default: 5,
  }),
  GIT_URL: str({ default: 'gitea-http.gitea.svc.cluster.local' }),
  GIT_PORT: str({ default: '3000' }),
  GIT_PROTOCOL: str({ default: 'http' }),
  APPS_REPO_URL: str({
    desc: 'Repository to set for ArgoCD applications',
    default: 'https://github.com/linode/apl-core.git',
  }),
  APPS_REVISION: str({
    desc: 'Target revision to set for ArgoCD applications. If not set, uses the current image tag.',
    default: undefined,
  }),
  COLLECTION_DURATION_SECONDS: num({ desc: 'Traces collection duration (default 30 min)', default: 1800 }),
  COLLECTION_INTERVAL_SECONDS: num({ desc: 'Traces collection interval (default 5 min)', default: 300 }),
  APL_OPERATOR_NAMESPACE: str({
    desc: 'Kubernetes namespace where the APL Operator is installed',
    default: 'apl-operator',
  }),
  TRACES_REPORT_NAME: str({
    desc: 'Kubernetes config map name for reporting traces',
    default: 'apl-traces-report',
  }),
  DEFAULT_CATALOG_URL: str({
    desc: 'The URL for the default APL catalog',
    default: 'https://github.com/linode/apl-charts.git',
  }),
}

export function cleanEnv<T>(spec: { [K in keyof T]: ValidatorSpec<T[K]> }, options?: CleanOptions<T>) {
  let pEnv: any = process.env
  // load local .env and $ENV_DIR/.secrets if we have it
  ;[`${process.cwd()}/.env`, `${pEnv.ENV_DIR}/.secrets`].forEach((path) => {
    if (existsSync(path)) {
      const result = config({ path })
      if (result.error) console.error(result.error)
      pEnv = { ...result.parsed, ...pEnv }
    }
  })
  return clean(pEnv, spec, options)
}

export const env = cleanEnv(cliEnvSpec, {})

export const isCli = env.OTOMI_DEV || !env.VALUES_INPUT
