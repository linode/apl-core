/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/require-await */
import express, { Request, Response } from 'express'
import { existsSync, mkdirSync, symlinkSync } from 'fs'
import { Server } from 'http'
import { genDrone } from '../cmd/gen-drone'
import { migrate } from '../cmd/migrate'
import { validateValues } from '../cmd/validate-values'
import { decrypt, encrypt } from '../common/crypt'
import { terminal } from '../common/debug'
import { env } from '../common/envalid'
import { rootDir } from '../common/utils'

const d = terminal('server')
const app = express()
let server: Server

export const stopServer = (): void => {
  server?.close()
}

app.get('/', async (req: Request, res: Response): Promise<Response<any>> => {
  return res.send({ status: 'ok' })
})

app.get('/init', async (req: Request, res: Response) => {
  try {
    d.log('Request to initialize values repo')
    await decrypt()
    await migrate()
    res.status(200).send('ok')
  } catch (error) {
    d.error(error)
    res.status(500).send(`${error}`)
  }
})

app.get('/prepare', async (req: Request, res: Response) => {
  try {
    d.log('Request to prepare values repo')
    await validateValues()
    await genDrone()
    await encrypt()
    res.status(200).send('ok')
  } catch (error) {
    const err = `${error}`
    let status = 500
    d.error(err)
    if (err.includes('Values validation FAILED')) {
      status = 422
    }
    res.status(status).send(err)
  }
})

export const startServer = (): void => {
  const k8sEnvDirPath = env.ENV_DIR
  const dockerEnvDir = `${rootDir}/env`
  // accomodate k8s deployment with shared values dir, and make symlink to /home/app/stack/env
  if (k8sEnvDirPath && !existsSync(k8sEnvDirPath)) {
    d.info('Creating k8s values folder for symlink: ', k8sEnvDirPath)
    mkdirSync(k8sEnvDirPath)
  }
  if (!existsSync(dockerEnvDir)) {
    d.info(`Creating symlink from ${k8sEnvDirPath} to ${dockerEnvDir}`)
    symlinkSync(k8sEnvDirPath, dockerEnvDir)
  }
  server = app.listen(17771, '0.0.0.0')
  d.log(`Server listening on http://0.0.0.0:17771`)
}

// Start server if invoked directly. We expect the script name to be the last arg
const a = process.argv
const lastArg = a[a.length - 1]
if (a.length && __filename.includes(lastArg)) {
  startServer()
}
