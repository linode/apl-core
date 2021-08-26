import $RefParser from '@apidevtools/json-schema-ref-parser'
import { load } from 'js-yaml'
import { set } from 'lodash-es'
import { Argv } from 'yargs'
import { prepareEnvironment } from '../common/setup'
import {
  BasicArguments,
  extract,
  flattenObject,
  getFilename,
  gucci,
  loadYaml,
  OtomiDebugger,
  setParsedArgs,
  terminal,
} from '../common/utils'
/**
 * This file is a scripting playground to test basic code
 * it's basically the same as EXAMPLE.ts
 * but loaded into the application to run.
 */

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

const pp = (obj: unknown): string => JSON.stringify(obj, null, 2)

// usage:
export const playground = async (): Promise<void> => {
  debug.log(cmdName)
  // console.log(argv)
  // console.log(process.stdin.isTTY)
  // console.log(process.stdout.isTTY)
  // const answer = await question('How are you?')
  // console.log(answer)
  const schema = await $RefParser.dereference(loadYaml('./values-schema.yaml'))
  const leaf = 'x-secret'

  // echo '{{ .v.username }}' | gucci -s v.username=abc
  // const val2 = { dot: { username: 'admin', password: 'bladibla' } }
  // const val1 = { 'dot.username': 'abc', 'dot.password': 'def' }

  // const jsonPaths = objectToPaths(val1)
  // const kv = jsonPaths
  //   .map((value) => {
  //     return { [`.${value}`]: get(val1, value) }
  //   })
  //   .reduce((acc, base) => {
  //     return { ...acc, ...base }
  //   }, {})
  // console.log(kv)

  // const gucciArgs = Object.entries(val1).map(([k, v]) => `-s ${k}='${v ?? ''}'`)
  // console.log(gucciArgs)
  const secrets = extract(schema, leaf, (val: any) => {
    if (val.length > 0) {
      const localRefs = ['.dot.', '.v.', '.root.', '.o.']
      if (localRefs.some((localRef) => val.includes(localRef))) return val
      return `{{ ${val} }}`
    }
    return undefined
  })
  // console.log(JSON.stringify(secrets, null, 2))
  const gucci1 = load((await gucci(secrets, {})) as string)
  const gucciFlat = flattenObject(gucci1)

  const res = Object.entries(gucciFlat)
    .filter(([k, v]) => {
      const localRefs = ['.dot.', '.v.', '.root.', '.o.']
      return localRefs.some((localRef) => v?.includes(localRef))
    })
    .map(([path, v]: string[]) => {
      // chart.harbor.registry.credentials.htpasswd: htpasswd .dot.username
      // chart.harbor.registry.credentials.htpasswd: htpasswd .v.registry.credentials.username
      // chart.harbor.registry.credentials.htpasswd: htpasswd chart.harbor.registry.credentials.username
      const dotDot = path.slice(0, path.lastIndexOf('.'))

      /* Get .v by getting the second . after charts
       * charts.hello.world
       * ^----------^ Get this content (charts.hello)
       */
      const dotV = path.slice(0, path.indexOf('.', path.indexOf('charts.') + 'charts.'.length))

      const sDot = v.replaceAll('.dot.', `.${dotDot}.`)
      const vDot = sDot.replaceAll('.v.', `.${dotV}.`)
      const oDot = vDot.replaceAll('.o.', '.otomi')
      const rootDot = oDot.replaceAll('.root.', '.')
      return [path, rootDot]
    })

  res.map(([k, v]) => {
    set(gucci1, k, `{{ ${v} }}`)
    return [k, v]
  })

  // TODO: create merge with values (from either chart or repo)

  // writeFileSync('/tmp/gucciTest', dump(gucci1))
  // console.log()
  console.log(await gucci(gucci1, gucci1 as { [key: string]: any }))
  // console.log(
  //   'abc',
  //   Object.fromEntries(

  //   ),
  // )
  // const paths = objectToPaths(secrets, leaf)
  // echo '{"charts":{"harbor":{"registry":{"credentials":{"htpasswd":{"x-secret2":"{{ htpasswd .dot.username .dot.password }}"}}}}}}' | gucci -s .dot.username='admin' -s .dot.password='bladibla'
  // const testObj = { a: { b: { c: 42, d: 84 }, h: 'g' } }
  // /*
  // a.b.c
  // a.b.d
  // a.h
  // */
  // console.log(merge(cloneDeep(testObj), { a: { b: { c: 24 } } }))
  // console.log(testObj)
  // console.log(JSON.stringify(secrets, null, 2))
  // debug.info('info')
  // debug.warn('warn')
  // debug.error('error')
  // debug.debug('debug')
  // debug.trace('trace')
  // debug.log(argv.nonInteractive)
  // // debug.log(argv)
  // const test = '"something"'
  // const out = await $`echo "${test}"`
  // console.log(out.stdout)
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
  await Promise.resolve()
}

export const module = {
  command: `${cmdName} [opts...]`,
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
