import dotenv from 'dotenv'
import { cleanEnv, num, str } from 'envalid'

// Load environment variables from .env file
dotenv.config()
export const operatorEnv = cleanEnv(process.env, {
  GITOPS_NS_MANIFESTS_RELATIVE_PATH: str({
    desc: 'Path to the gitops manifests namespace',
    default: 'env/manifests/namespaces',
  }),
  GITOPS_GLOBAL_MANIFESTS_RELATIVE_PATH: str({
    desc: 'Path to the gitops manifests global',
    default: 'env/manifests/global',
  }),
  POLL_INTERVAL_MS: num({ desc: 'Interval in which the operator polls Git', default: 15000 }),
  RECONCILE_INTERVAL_MS: num({ desc: 'Interval in which the operator reconciles the cluster in', default: 300_000 }),
  GIT_OP_TIMEOUT_MS: num({ desc: 'Timeout in milliseconds for a single git operation', default: 10000 }),
  INSTALL_RETRIES: num({ desc: 'Number of installation retry attempts', default: 1000 }),
  INSTALL_MAX_TIMEOUT_MS: num({ desc: 'Maximum timeout for installation retries in milliseconds', default: 10000 }),
})
