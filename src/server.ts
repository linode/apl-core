/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/require-await */
import $RefParser, { JSONSchema } from '@apidevtools/json-schema-ref-parser'
import express, { Request, Response } from 'express'
import { Server } from 'http'
import { bootstrapSops } from 'src/cmd/bootstrap'
import { validateValues } from 'src/cmd/validate-values'
import { decrypt, encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { hfValues } from './common/hf'
import { setValuesFile, unsetValuesFile } from './common/repo'
import { loadYaml, rootDir } from './common/utils'
import { objectToYaml } from './common/values'

const d = terminal('server')
const app = express()
let server: Server

export const stopServer = (): void => {
  server?.close()
}

app.get('/', async (req: Request, res: Response): Promise<Response<any>> => {
  return res.send({ status: 'ok' })
})

type QueryParams = {
  envDir: string
}

app.get('/init', async (req: Request, res: Response) => {
  const { envDir } = req.query as QueryParams
  try {
    d.log('Request to initialize values repo')
    await decrypt(envDir)
    res.status(200).send('ok')
  } catch (error) {
    d.error(error)
    res.status(500).send(`${error}`)
  }
})

app.get('/prepare', async (req: Request, res: Response) => {
  const { envDir } = req.query as QueryParams
  try {
    d.log('Request to prepare values repo')
    await bootstrapSops(envDir)
    await setValuesFile(envDir)
    // Encrypt ensures that a brand new secret file is encrypted in place
    await encrypt(envDir)
    // Decrypt ensures that a brand new encrypted secret file is decrypted to the .dec file
    await decrypt(envDir)
    await validateValues(envDir)
    res.status(200).send('ok')
  } catch (error) {
    const err = `${error}`
    let status = 500
    d.error(err)
    if (err.includes('Values validation FAILED')) {
      status = 422
    }
    res.status(status).send(err)
  } finally {
    await unsetValuesFile(envDir)
  }
})

function parseBoolean(string, defaultValue = false) {
  return string === 'true' ? true : string === 'false' ? false : defaultValue
}
app.get('/otomi/values', async (req: Request, res: Response) => {
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

app.get('/apl/schema', async (req: Request, res: Response) => {
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
