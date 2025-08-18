import * as dotenv from 'dotenv'
import { terminal } from '../common/debug'
import { AplOperator, AplOperatorConfig } from './apl-operator'
import { operatorEnv } from './validators'
import { env } from '../common/envalid'
import fs from 'fs'
import path from 'path'
import { GitRepository } from './git-repository'
import { AplOperations } from './apl-operations'
import { getErrorMessage } from './utils'

dotenv.config()

const d = terminal('operator:main')

function loadConfig(): AplOperatorConfig {
  const username = operatorEnv.GIT_USERNAME
  const password = operatorEnv.GIT_PASSWORD
  const gitHost = env.GIT_URL
  const gitPort = env.GIT_PORT
  const gitProtocol = env.GIT_PROTOCOL
  const repoPath = env.ENV_DIR
  const gitOrg = operatorEnv.GIT_ORG
  const gitRepo = operatorEnv.GIT_REPO
  const pollIntervalMs = operatorEnv.POLL_INTERVAL_MS
  const reconcileIntervalMs = operatorEnv.RECONCILE_INTERVAL_MS
  const gitRepository = new GitRepository({
    username,
    password,
    gitHost,
    gitPort,
    gitProtocol,
    repoPath,
    gitOrg,
    gitRepo,
  })
  const aplOps = new AplOperations()

  return {
    gitRepo: gitRepository,
    aplOps,
    pollIntervalMs,
    reconcileIntervalMs,
  }
}

function handleTerminationSignals(operator: AplOperator): void {
  function exitHandler(signal: string) {
    d.info(`Received ${signal}, shutting down...`)
    operator.stop()
    process.exit(0)
  }

  process.on('SIGTERM', () => exitHandler('SIGTERM'))
  process.on('SIGINT', () => exitHandler('SIGINT'))
}

async function main(): Promise<void> {
  try {
    d.info('Starting APL Operator')

    const repoPath = env.ENV_DIR
    // Only delete contents of the directory
    if (fs.existsSync(repoPath)) {
      d.info(`Clearing directory contents of ${repoPath}`)
      for (const entry of fs.readdirSync(repoPath)) {
        const entryPath = path.join(repoPath, entry)
        fs.rmSync(entryPath, { recursive: true, force: true })
      }
    }
    const parentDir = path.dirname(repoPath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }

    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true })
    }
    const config = loadConfig()

    const operator = new AplOperator(config)

    handleTerminationSignals(operator)

    await operator.start()
  } catch (error) {
    d.error('Failed to start APL Operator:', getErrorMessage(error))
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    d.error('Unhandled error in main:', getErrorMessage(error))
    process.exit(1)
  })
}

export default main
