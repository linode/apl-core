import express, { Request, Response } from 'express'
import { Server } from 'http'
import { terminal } from 'src/common/debug'
import { hfValues } from './common/hf'
import { objectToYaml } from './common/values'

const d = terminal('server')
const app = express()
let server: Server

export const stopServer = (): void => {
  server?.close()
}
// Return statement is not needed anymore in express 5.x and above
app.get('/', async (req: Request, res: Response): Promise<void> => {
  res.send({ status: 'ok' })
})

type QueryParams = {
  envDir: string
}

function parseBoolean(string: any, defaultValue = false): boolean {
  return string === 'true' ? true : string === 'false' ? false : defaultValue
}
app.get('/otomi/values', async (req: Request, res: Response): Promise<void> => {
  const { envDir } = req.query as QueryParams

  const filesOnly = parseBoolean(req.query.filesOnly, true)
  const excludeSecrets = parseBoolean(req.query.excludeSecrets, true)
  const withWorkloadValues = parseBoolean(req.query.withWorkloadValues, true)
  d.log('Get otomi values', req.query)
  try {
    const data = await hfValues({ filesOnly, excludeSecrets, withWorkloadValues }, envDir)
    res.setHeader('Content-type', 'text/plain')
    const yamlData = objectToYaml(data!)
    res.status(200).send(yamlData)
  } catch (error) {
    const status = 500
    d.error(error)
    res.status(status).send(error)
  }
})

export const startServer = (): void => {
  server = app
    .listen(17771, '127.0.0.1', () => {
      d.log(`Server listening on http://127.0.0.1:17771`)
    })
    .on('error', (e) => {
      console.error(e)
    })
}

// Add this at the bottom of the file or in a lifecycle manager
process.on('SIGINT', () => {
  d.info('Shutting down server')
  stopServer()
  process.exit(0)
})

process.on('SIGTERM', () => {
  d.info('Shutting down server')
  stopServer()
  process.exit(0)
})
