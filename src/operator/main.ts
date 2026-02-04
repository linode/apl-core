import * as dotenv from 'dotenv'
import { terminal } from '../common/debug'
import { AplOperator, AplOperatorConfig } from './apl-operator'
import { Installer } from './installer'
import { operatorEnv } from './validators'
import { env } from '../common/envalid'
import fs from 'fs'
import path from 'path'
import { AplOperations } from './apl-operations'
import { getErrorMessage } from './utils'
import { GitRepository } from './git-repository'
import { getStoredGitRepoConfig } from '../common/git-config'
import process from 'node:process'
import { runTraceCollectionLoop } from '../cmd/traces'

dotenv.config()

const d = terminal('operator:main')

async function loadConfig(aplOps: AplOperations): Promise<AplOperatorConfig> {
  // Get git config from stored ConfigMap/Secret - NOT from hfValues()
  // This avoids the path issues with helmfile templates expecting ENV_DIR to be parent of env/
  const gitConfig = await getStoredGitRepoConfig()

  if (!gitConfig) {
    throw new Error('Git config not found in stored secrets/configmap. Run installation first.')
  }

  const gitRepository = new GitRepository({
    authenticatedUrl: gitConfig.authenticatedUrl,
    repoPath: env.ENV_DIR,
  })

  return {
    gitRepo: gitRepository,
    gitConfig,
    aplOps,
    pollIntervalMs: operatorEnv.POLL_INTERVAL_MS,
    reconcileIntervalMs: operatorEnv.RECONCILE_INTERVAL_MS,
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

    // Start trace collection in background (runs for 30 minutes from ConfigMap creation)
    runTraceCollectionLoop().catch((error) => {
      d.warn('Trace collection loop failed:', getErrorMessage(error))
    })

    // Phase 2: Set environment variables and start operator for GitOps operations
    await installer.setEnvAndCreateSecrets()
    const config = await loadConfig(aplOps)
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
