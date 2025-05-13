import * as dotenv from 'dotenv'
import { terminal } from '../common/debug'
import { AplOperator } from './apl-operator'
import { operatorEnv } from './validators'
import { env } from '../common/envalid'
import fs from 'fs'
import path from 'path'

dotenv.config()

const d = terminal('operator:main')

interface OperatorConfig {
  giteaUsername: string
  giteaPassword: string
  giteaUrl: string
  giteaProtocol: string
  repoPath: string
}

function loadConfig(): OperatorConfig {
  const giteaUsername = operatorEnv.GITEA_USERNAME
  const giteaPassword = operatorEnv.GITEA_PASSWORD
  const giteaUrl = env.GITEA_URL
  const giteaProtocol = env.GITEA_PROTOCOL
  const repoPath = env.ENV_DIR

  return {
    giteaUsername,
    giteaPassword,
    giteaUrl,
    giteaProtocol,
    repoPath,
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

    const config = loadConfig()
    const repoPath = env.ENV_DIR
    // Remove the existing directory if it exists and is not empty
    if (fs.existsSync(repoPath) && fs.readdirSync(repoPath).length > 0) {
      this.d.info('Removing existing repository directory')
      fs.rmSync(repoPath, { recursive: true, force: true })
    }
    const parentDir = path.dirname(repoPath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }

    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true })
    }

    const operator = new AplOperator(
      config.giteaUsername,
      config.giteaPassword,
      config.giteaUrl,
      config.giteaProtocol,
      config.repoPath,
    )

    handleTerminationSignals(operator)

    await operator.start()

    d.info('APL Operator started successfully')
  } catch (error) {
    d.error('Failed to start APL Operator:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error) => {
    d.error('Unhandled error in main:', error)
    process.exit(1)
  })
}

export default main
