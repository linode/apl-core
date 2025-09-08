import dotenv from 'dotenv'
import { cleanEnv, num, str } from 'envalid'

// Load environment variables from .env file
dotenv.config()
export const operatorEnv = cleanEnv(process.env, {
  GIT_USERNAME: str({ desc: 'Git username', default: '' }),
  GIT_PASSWORD: str({ desc: 'Git password', default: '' }),
  GIT_ORG: str({ desc: 'Git organisation', default: 'otomi' }),
  GIT_REPO: str({ desc: 'Git repository', default: 'values' }),
  SOPS_AGE_KEY: str({ desc: 'SOPS age key', default: '' }),
  POLL_INTERVAL_MS: num({ desc: 'Interval in which the operator polls Git', default: 1000 }),
  RECONCILE_INTERVAL_MS: num({ desc: 'Interval in which the operator reconciles the cluster in', default: 300_000 }),
  INSTALL_RETRIES: num({ desc: 'Number of installation retry attempts', default: 10 }),
  INSTALL_MAX_TIMEOUT_MS: num({ desc: 'Maximum timeout for installation retries in milliseconds', default: 10000 }),
})
