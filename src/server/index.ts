/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/require-await */
import express, { Request, Response } from 'express'
import { existsSync, mkdirSync, symlinkSync } from 'fs'
import { Server } from 'http'
import { commit } from '../cmd/commit'
import { genDrone } from '../cmd/gen-drone'
import { validateValues } from '../cmd/validate-values'
import { decrypt, encrypt } from '../common/crypt'
import { terminal } from '../common/debug'
import { env } from '../common/envalid'
import { rootDir } from '../common/utils'

const debug = terminal('server')
const app = express()
let server: Server

export const stopServer = (): void => {
  server?.close()
}

app.get('/', async (req: Request, res: Response): Promise<Response<any>> => {
  return res.send({ status: 'ok' })
})

app.get('/decrypt', async (req: Request, res: Response) => {
  try {
    debug.log('Request to decrypt')
    await decrypt()
    res.status(200).send('ok')
  } catch (error) {
    debug.error(error)
    res.status(500).send(`${error}`)
  }
})
app.get('/encrypt', async (req: Request, res: Response) => {
  try {
    debug.log('Request to encrypt')
    await validateValues()
    await genDrone()
    await encrypt()
    res.status(200).send('ok')
  } catch (error) {
    const err = `${error}`
    let status = 500
    debug.error(err)
    if (err.includes('Values validation FAILED')) {
      status = 422
    }
    res.status(status).send(err)
  }
})

app.get('/commit', async (req: Request, res: Response) => {
  try {
    debug.log('Request to commit')
    await commit()
    res.status(200).send('ok')
  } catch (error) {
    debug.error(error)
    res.status(500).send(`${error}`)
  }
})

export const startServer = (): void => {
  const k8sEnvDirPath = env().ENV_DIR
  const dockerEnvDir = `${rootDir}/env`
  // accomodate k8s deployment with shared values dir, and make symlink to /home/app/stack/env
  if (k8sEnvDirPath && !existsSync(k8sEnvDirPath)) {
    debug.info('Creating k8s values folder for symlink: ', k8sEnvDirPath)
    mkdirSync(k8sEnvDirPath)
  }
  if (!existsSync(dockerEnvDir)) {
    debug.info(`Creating symlink from ${k8sEnvDirPath} to ${dockerEnvDir}`)
    symlinkSync(k8sEnvDirPath, dockerEnvDir)
  }
  server = app.listen(17771, '0.0.0.0')
  debug.log(`Container listening on http://0.0.0.0:17771`)
}
