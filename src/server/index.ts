/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/require-await */
import express, { Request, Response } from 'express'
import { Server } from 'http'
import { commit } from '../cmd/commit'
import { decrypt, encrypt } from '../common/crypt'
import { terminal } from '../common/utils'

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
    await decrypt()
    res.status(200).send('ok')
  } catch (error) {
    res.status(500).send(error)
  }
})
app.get('/encrypt', async (req: Request, res: Response) => {
  try {
    await encrypt()
    res.status(200).send('ok')
  } catch (error) {
    res.status(500).send(error)
  }
})

app.get('/commit', async (req: Request, res: Response) => {
  try {
    await commit()
    res.status(200).send('ok')
  } catch (error) {
    res.status(500).send(error)
  }
})

export const startServer = (): void => {
  server = app.listen(17771, '0.0.0.0')
  debug.log(`Container listening on http://0.0.0.0:17771`)
}

export default startServer
