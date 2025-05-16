import dotenv from 'dotenv'
import { cleanEnv, num, str } from 'envalid'

// Load environment variables from .env file
dotenv.config()
export const operatorEnv = cleanEnv(process.env, {
  GIT_USERNAME: str({ desc: 'Git username' }),
  GIT_PASSWORD: str({ desc: 'Git password' }),
  GIT_ORG: str({ desc: 'Git organisation', default: 'otomi' }),
  GIT_REPO: str({ desc: 'Git repository', default: 'values' }),
  SOPS_AGE_KEY: str({ desc: 'SOPS age key' }),
  POLL_INTERVAL_MS: num({ desc: 'Interval in which the operator polls Git', default: 1000 }),
  RECONCILE_INTERVAL_MS: num({ desc: 'Interval in which the operator reconciles the cluster in', default: 300_000 }),
})
