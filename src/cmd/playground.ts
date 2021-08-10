import { Argv } from 'yargs'
import { $ } from 'zx'
import { prepareEnvironment } from '../common/setup'
import { BasicArguments, getFilename, OtomiDebugger, setParsedArgs, terminal } from '../common/utils'
import { generateSecrets } from './lib/gen-secrets'

/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

// usage:
export const playground = async (): Promise<void> => {
  debug.log(cmdName)
  await generateSecrets()
  // debug.info('info')
  // debug.warn('warn')
  // debug.error('error')
  // debug.debug('debug')
  // debug.trace('trace')
  // debug.log(argv.nonInteractive)
  // debug.log(argv)
  const test = '"something"'
  const out = await $`echo "${test}"`
  console.log(out.stdout)
  // console.log(process.cwd())
  // console.log(await currDir())
  // cd(env.ENV_DIR)
  // console.log(process.cwd())
  // console.log(await currDir())
  // const cdVal = await currDir()
  // const path = `${cdVal}/values-schema.yaml`
  // // const yaml = loadYaml(path)
  // const yaml2 = load(readFileSync(path, 'utf-8'), { json: true }) as any
  // console.log(yaml2.properties?.alerts)
  // // const script = $`echo 1; sleep 1; echo 2; sleep 1; echo 3;`
  // // script.stdout.pipe(debug.stream.log)
  // // const out = await script
  // // debug.log('Break')
  // // debug.log(out.stdout.trim())
  // debug.log(env)
  // debug.log(process.env)

  // throw new Error('Playground error')
}

export const module = {
  command: cmdName,
  hidden: true,
  describe: undefined,
  builder: (parser: Argv): Argv => parser,

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipAllPreChecks: true })
    await playground()
  },
}

export default module
