import { readFileSync, rmSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { loadAll } from 'js-yaml'
import tar from 'tar'
import { Argv } from 'yargs'
import { $, cd, chalk, nothrow } from 'zx'
import { hfTemplate } from '../common/hf'
import { cleanupHandler, getK8sVersion, prepareEnvironment } from '../common/setup'
import {
  getFilename,
  getParsedArgs,
  OtomiDebugger,
  readdirRecurse,
  rootDir,
  setParsedArgs,
  terminal,
} from '../common/utils'
import { Arguments, helmOptions } from '../common/yargs-opts'

const cmdName = getFilename(import.meta.url)
const debug: OtomiDebugger = terminal(cmdName)

const schemaOutputPath = '/tmp/otomi/kubernetes-json-schema'
const outputPath = '/tmp/otomi/generated-crd-schemas'
const k8sResourcesPath = '/tmp/otomi/generated-manifests'

let k8sVersion: string
let vk8sVersion: string

const cleanup = (argv: Arguments): void => {
  if (argv.skipCleanup) return
  debug.log('Cleaning')
  rmSync(schemaOutputPath, { recursive: true, force: true })
  rmSync(outputPath, { recursive: true, force: true })
  rmSync(k8sResourcesPath, { recursive: true, force: true })
}

const setup = async (argv: Arguments): Promise<void> => {
  cleanupHandler(() => cleanup(argv))

  k8sVersion = getK8sVersion()
  vk8sVersion = `v${k8sVersion}`

  let prep: Promise<any>[] = []
  prep.push(mkdir(`${schemaOutputPath}/${vk8sVersion}-standalone`, { recursive: true }))
  prep.push(mkdir(outputPath, { recursive: true }))
  prep.push(mkdir(k8sResourcesPath, { recursive: true }))
  await Promise.allSettled(prep)

  prep = []

  prep.push(
    tar.x({
      file: `schemas/${vk8sVersion}-standalone.tar.gz`,
      C: `${schemaOutputPath}/`,
    }),
  )

  prep.push(
    tar.x({
      file: `schemas/generated-crd-schemas.tar.gz`,
      C: `${schemaOutputPath}/${vk8sVersion}-standalone`,
    }),
  )

  await Promise.allSettled(prep)
}

type crdSchema = {
  filename: string
  schema: {
    description: string
    properties: string
    required: string[]
    title: string
    type: string
    $schema: string
    'x-kubernetes-group-version-kind.group': string
    'x-kubernetes-group-version-kind.kind': string
    'x-kubernetes-group-version-kind.version': string
  }
}

const processCrd = (path: string): crdSchema[] => {
  const documents: any[] = loadAll(readFileSync(path, 'utf-8')).filter(
    (singleDoc: any) => singleDoc?.kind === 'CustomResourceDefinition',
  )

  const documentResult = documents.flatMap((document: any) => {
    const versions = document.spec.versions ?? [{ name: document.spec.version }]
    const versionSchema = versions.flatMap((version: any) => {
      const vers = version.name
      const schema = version.schema ?? document?.spec?.validation
      return {
        filename: `${(document.spec.names.kind as string).toLowerCase()}-${
          document.spec.group.split('.')[0]
        }-${vers}.json`,
        schema: {
          description: schema?.openAPIV3Schema?.description ?? '',
          properties: schema?.openAPIV3Schema?.properties,
          required: schema?.openAPIV3Schema?.required ?? [],
          title: document.metadata.name,
          type: 'object',
          $schema: 'http://json-schema.org/draft/2019-09/schema#',
          'x-kubernetes-group-version-kind.group': document.spec.group,
          'x-kubernetes-group-version-kind.kind': document.spec.names.kind,
          'x-kubernetes-group-version-kind.version': vers,
        },
      }
    })
    return versionSchema
  })
  return documentResult
}

const processCrdWrapper = async (argv: Arguments) => {
  debug.log(`Generating k8s ${k8sVersion} manifests`)
  const oldK8SVoverride = process.env.KUBE_VERSION_OVERRIDE
  process.env.KUBE_VERSION_OVERRIDE = `${vk8sVersion}.0`
  await hfTemplate(argv, `${k8sResourcesPath}/${vk8sVersion}`)
  process.env.KUBE_VERSION_OVERRIDE = oldK8SVoverride

  debug.log('Processing CRD files...')
  cd(rootDir)
  const chartsFiles = await readdirRecurse('charts')
  const crdFiles = chartsFiles.filter((val: string) => val.match(/crds\/.*\.yaml/g))
  const results = await Promise.all(crdFiles.flatMap((crdFile: string): crdSchema[] => processCrd(crdFile)))

  const prep: Promise<any>[] = []

  prep.push(writeFile(`${outputPath}/all.json`, JSON.stringify(results)))

  prep.push(
    ...results.map(async (val: any) =>
      writeFile(`${schemaOutputPath}/${vk8sVersion}-standalone/${val.filename}`, JSON.stringify(val.schema)),
    ),
  )
  await Promise.all(prep)
}

export const validateTemplates = async (): Promise<void> => {
  const argv: Arguments = getParsedArgs()
  await setup(argv)
  await processCrdWrapper(argv)
  const constraintKinds = [
    'PspAllowedRepos',
    'BannedImageTags',
    'ContainerLimits',
    'PspAllowedUsers',
    'PspHostFilesystem',
    'PspHostNetworkingPorts',
    'PspPrivileged',
    'PspApparmor',
    'PspCapabilities',
    'PspForbiddenSysctls',
    'PspHostSecurity',
    'PspSeccomp',
    'PspSelinux',
  ]
  // TODO: revisit these excluded resources and see it they exist now (from original sh script)
  const skipKinds = ['CustomResourceDefinition', 'AppRepository', ...constraintKinds]
  const skipFilenames = ['crd', 'constraint']

  debug.log('Validating resources')
  const quiet = !argv.verbose ? [] : ['--quiet']
  debug.info(`Schema Output Path: ${schemaOutputPath}`)
  debug.info(`Skip kinds: ${skipKinds.join(', ')}`)
  debug.info(`Skip Filenames: ${skipFilenames.join(', ')}`)
  debug.info(`K8S Resource Path: ${k8sResourcesPath}`)
  debug.info(`Schema location: file://${schemaOutputPath}`)
  const kubevalOutput = await nothrow(
    $`kubeval ${quiet} --skip-kinds ${skipKinds.join(',')} --ignored-filename-patterns ${skipFilenames.join(
      ',',
    )} -d ${k8sResourcesPath} --schema-location file://${schemaOutputPath} --kubernetes-version ${k8sVersion}`,
  )
  const output = kubevalOutput.stdout
    .split('\n')
    .map((x) => {
      const [k, v] = x.split(' - ')
      const obj: any = {}
      obj[k] = [v]
      return obj
    })
    .reduce((prev, curr) => {
      const prevObj = { ...prev }
      Object.entries(curr).map(([key, value]: [string, any[]]) => {
        const prevArr: any[] = prevObj[key] ?? []
        const currArr: any[] = value ?? []
        prevObj[key] = [...new Set([...prevArr, ...currArr])]
        return key
      })
      return prevObj
    })
  output.PASS?.map((_val: string) => debug.debug(`${chalk.greenBright('PASS: ')} ${chalk.italic('%s')}`, _val))
  output.WARN?.map((_val: string) => debug.warn(`${chalk.yellowBright('WARN: ')} %s`, _val))
  if (kubevalOutput.exitCode !== 0) {
    output.ERR?.map((_val: string) => debug.error(`${chalk.redBright('ERR: ')} %s`, _val))
    throw new Error('Templating FAILED')
  } else debug.log('Templating SUCCESS')
}

export const module = {
  command: cmdName,
  describe: 'Validate generated manifests against supported k8s versions/CRDs and best practices',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await validateTemplates()
  },
}

export default module
