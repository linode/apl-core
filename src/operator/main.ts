import * as dotenv from 'dotenv'
import { terminal } from '../common/debug'
import { AplOperator, AplOperatorConfig } from './apl-operator'
import { GitCredentials, Installer } from './installer'
import { operatorEnv } from './validators'
import { env } from '../common/envalid'
import fs from 'fs'
import path from 'path'
import { AplOperations } from './apl-operations'
import { getErrorMessage } from './utils'
import { GitRepository } from './git-repository'
import process from 'node:process'

dotenv.config()

const d = terminal('operator:main')

function loadConfig(aplOps: AplOperations, gitCredentials: GitCredentials): AplOperatorConfig {
  // Get credentials from process.env directly since they may have been set after operatorEnv was parsed
  const { username } = gitCredentials
  const { password } = gitCredentials
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

function ensureDirectoryStructure() {
  const repoPath = env.ENV_DIR
  const parentDir = path.dirname(repoPath)
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true })
  }

  if (!fs.existsSync(repoPath)) {
    fs.mkdirSync(repoPath, { recursive: true })
  }
}

async function main(): Promise<void> {
  try {
    d.info('Starting APL Operator')
    ensureDirectoryStructure()
    const aplOps = new AplOperations()

    // Phase 1: Run installation with retry until success
    const installer = new Installer(aplOps)
    const isInstalled = await installer.isInstalled()
    if (isInstalled) {
      d.info('Installation already completed, skipping install steps')
    } else {
      d.info('=== Starting Installation Process ===')
      await installer.initialize()
      await installer.reconcileInstall()
    }
    const gitCredentials = await installer.setEnvAndCreateSecrets()

    // Phase 2: Start operator for GitOps operations
    const config = loadConfig(aplOps, gitCredentials)
    const operator = new AplOperator(config)
    handleTerminationSignals(operator)
    d.info('=== Starting Operator Process ===')
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
