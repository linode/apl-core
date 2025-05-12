import * as dotenv from 'dotenv'
import { terminal } from '../common/debug'
import { AplOperator } from './apl-operator'

// Load environment variables
dotenv.config()

const d = terminal('operator:main')

interface OperatorConfig {
  giteaUsername: string
  giteaPassword: string
  giteaUrl: string
}

// Load configuration from environment variables
function loadConfig(): OperatorConfig {
  const giteaUsername = process.env.GITEA_USERNAME!
  const giteaPassword = process.env.GITEA_PASSWORD!
  const giteaUrl = process.env.GITEA_URL!

  return {
    giteaUsername,
    giteaPassword,
    giteaUrl,
  }
}

// Gracefully handle termination signals
function handleTerminationSignals(operator: AplOperator): void {
  function exitHandler(signal: string) {
    d.info(`Received ${signal}, shutting down...`)
    operator.stop()
    process.exit(0)
  }

  process.on('SIGTERM', () => exitHandler('SIGTERM'))
  process.on('SIGINT', () => exitHandler('SIGINT'))
}

// Main function
async function main(): Promise<void> {
  try {
    d.info('Starting APL Operator')

    // Load configuration
    const config = loadConfig()

    // Create and start the Gitea operator
    const operator = new AplOperator(config.giteaUsername, config.giteaPassword, config.giteaUrl)

    // Set up signal handlers
    handleTerminationSignals(operator)

    // Start the operator
    await operator.start()

    d.info('APL Operator started successfully')
  } catch (error) {
    d.error('Failed to start APL Operator:', error)
    process.exit(1)
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    d.error('Unhandled error in main:', error)
    process.exit(1)
  })
}

export default main
