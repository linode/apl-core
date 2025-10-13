import $RefParser, { JSONSchema } from '@apidevtools/json-schema-ref-parser'
import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { copyFile } from 'fs/promises'
import { Server } from 'http'
import * as path from 'path'
import { bootstrapSops } from 'src/cmd/bootstrap'
import { decrypt, encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { hfValues } from './common/hf'
import { setValuesFile, unsetValuesFile } from './common/repo'
import { loadYaml, rootDir } from './common/utils'
import { objectToYaml } from './common/values'

const d = terminal('server')
const app = express()
let server: Server

// Rate limiter for expensive routes
const prepareLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: 'Too many requests, please try again later.',
})

export const stopServer = (): void => {
  server?.close()
}
// Return statement is not needed anymore in express 5.x and above
app.get('/', async (req: Request, res: Response): Promise<void> => {
  res.send({ status: 'ok' })
})

type QueryParams = {
  envDir: string
  files?: string[]
}

app.get('/init', async (req: Request, res: Response): Promise<void> => {
  const { envDir } = req.query as QueryParams
  try {
    d.log('Request to initialize values repo on', envDir)
    await decrypt(envDir)
    res.status(200).send('ok')
  } catch (error) {
    d.error(error)
    res.status(500).send(`${error}`)
  }
})

app.get('/prepare', prepareLimiter, async (req: Request, res: Response): Promise<void> => {
  const { envDir, files } = req.query as QueryParams
  // Define the allowed environment root directory
  const allowedEnvsRoot = path.resolve(rootDir, '.envs')
  let resolvedEnvDir = path.resolve(allowedEnvsRoot, envDir || '')
  try {
    // Check if the resolved environment directory is inside the allowed root
    if (!resolvedEnvDir.startsWith(allowedEnvsRoot)) {
      res.status(403).send('Forbidden: Invalid envDir path.')
      return
    }
    d.log('Request to prepare values repo on', resolvedEnvDir)
    const file = '.editorconfig'
    const srcFile = path.resolve(rootDir, '.values', file)
    const destFile = path.resolve(resolvedEnvDir, file)
    await copyFile(srcFile, destFile)
    await bootstrapSops(resolvedEnvDir)
    await setValuesFile(resolvedEnvDir)
    // Encrypt ensures that a brand new secret file is encrypted in place
    await encrypt(resolvedEnvDir, ...(files ?? []))
    // Decrypt ensures that a brand new encrypted secret file is decrypted to the .dec file
    await decrypt(resolvedEnvDir, ...(files ?? []))
    res.status(200).send('ok')
  } catch (error) {
    const err = `${error}`
    let status = 500
    d.error(`Request to prepare values went wrong: ${err}`)
    if (err.includes('Values validation FAILED')) {
      status = 422
    }
    res.status(status).send(err)
  } finally {
    await unsetValuesFile(resolvedEnvDir)
  }
})

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

app.get('/apl/schema', async (req: Request, res: Response): Promise<void> => {
  const schema = await loadYaml(`${rootDir}/values-schema.yaml`)
  const derefSchema = await $RefParser.dereference(schema as JSONSchema)
  res.setHeader('Content-type', 'application/json')
  res.status(200).send(derefSchema)
})

export const startServer = (): void => {
  server = app
    .listen(17771, '0.0.0.0', () => {
      d.log(`Server listening on http://0.0.0.0:17771`)
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
