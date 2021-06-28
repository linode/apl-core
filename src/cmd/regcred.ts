import { Argv } from 'yargs'
import { $ } from 'zx'
import {
  ask,
  BasicArguments,
  cleanupHandler,
  otomi,
  OtomiDebugger,
  PrepareEnvironmentOptions,
  terminal,
} from '../common/index'

interface Arguments extends BasicArguments {
  server: string
  username: string
  u: string
  password: string
  p: string
}

const fileName = 'regcred'
let debug: OtomiDebugger

/* eslint-disable no-useless-return */
const cleanup = (argv: Arguments): void => {
  if (argv['skip-cleanup']) return
}
/* eslint-enable no-useless-return */

const setup = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  if (argv._[0] === fileName) cleanupHandler(() => cleanup(argv))
  debug = terminal(fileName)

  if (options) await otomi.prepareEnvironment(debug, options)
}

export const regCred = async (argv: Arguments, options?: PrepareEnvironmentOptions): Promise<void> => {
  await setup(argv, options)

  const server =
    argv?.server ??
    process.env.DOCKER_SERVER ??
    (await ask('Please provide the docker server as it was not passed as an argument or environment variable'))
  const username =
    argv?.username ??
    process.env.DOCKER_USERNAME ??
    (await ask('Please provide the docker username as it was not passed as an argument or environment variable'))
  const password =
    argv?.password ??
    process.env.DOCKER_PASSWORD ??
    (await ask('Please provide the docker password as it was not passed as an argument or environment variable'))

  const outputEnc = (
    await $`kubectl create secret docker-registry --dry-run=client regcred --docker-server="${server}" --docker-username="${username}" --docker-password="${password}" --docker-email=not@us.ed -ojsonpath='{.data.\.dockerconfigjson}'`
  ).stdout
  const output = Buffer.from(outputEnc, 'base64').toString()
  debug.log(output)
}

export const module = {
  command: fileName,
  describe: '',
  builder: (parser: Argv): Argv =>
    parser.options({
      server: {
        describe: 'Docker server',
        group: 'otomi regcred options',
      },
      username: {
        alias: ['u'],
        describe: 'Docker username',
        group: 'otomi regcred options',
      },
      password: {
        alias: ['p'],
        describe: 'Docker password',
        group: 'otomi regcred options',
      },
    }),
  handler: async (argv: Arguments): Promise<void> => {
    await regCred(argv, { skipKubeContextCheck: true })
  },
}

export default module
