import { readFileSync, rmSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { loadAll } from 'js-yaml'
import { glob } from 'glob'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { terminal } from 'src/common/debug'
import { hfTemplate } from 'src/common/hf'
import { getFilename, readdirRecurse, rootDir } from 'src/common/utils'
import { getK8sVersion } from 'src/common/values'
import { BasicArguments, HelmArguments, getParsedArgs, helmOptions, setParsedArgs } from 'src/common/yargs'
import * as tar from 'tar'
import { Argv } from 'yargs'
import { $, chalk } from 'zx'

const cmdName = getFilename(__filename)

const schemaOutputPath = '/tmp/otomi/kubernetes-json-schema'
const outputPath = '/tmp/otomi/generated-crd-schemas'
const k8sResourcesPath = '/tmp/otomi/generated-manifests'

let k8sVersion: string
let vk8sVersion: string

const cleanup = (argv: BasicArguments): void => {
  if (argv.skipCleanup) return
  rmSync(schemaOutputPath, { recursive: true, force: true })
  rmSync(outputPath, { recursive: true, force: true })
  rmSync(k8sResourcesPath, { recursive: true, force: true })
}

const setup = async (argv: HelmArguments): Promise<void> => {
  cleanupHandler(() => cleanup(argv))

  k8sVersion = getK8sVersion(argv)
  vk8sVersion = `v${k8sVersion}`

  let prep: Promise<any>[] = []
  prep.push(mkdir(`${schemaOutputPath}/${vk8sVersion}-standalone`, { recursive: true }))
  prep.push(mkdir(outputPath, { recursive: true }))
  prep.push(mkdir(k8sResourcesPath, { recursive: true }))
  await Promise.allSettled(prep)

  prep = []

  // Make sure tar is properly initialized before using it
  if (!tar || typeof tar.x !== 'function') {
    throw new Error('tar module not properly initialized. Make sure it is imported correctly.')
  }

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
  const d = terminal(`cmd:${cmdName}:processCrd`)
  d.debug('Processing CRD file: ', path)

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

const processCrdWrapper = async (argv: BasicArguments) => {
  const d = terminal(`cmd:${cmdName}:processCrdWrapper`)
  d.log(`Generating k8s ${k8sVersion} manifests`)
  await hfTemplate(argv, `${k8sResourcesPath}/${vk8sVersion}`)

  d.log('Processing CRD files...')
  const crdFiles = await glob('**/crds/**/*.yaml', {
    ignore: [
      // Templates can usually not be processed directly
      '**/templates/crds/**',
      // These also come statically with the chart
      'kube-prometheus-stack/charts/crds/templates/**',
    ],
    cwd: `${rootDir}/charts`,
    absolute: true,
    nodir: true,
  })
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
  const d = terminal(`cmd:${cmdName}:validateTemplates`)
  const argv: HelmArguments = getParsedArgs()
  await setup(argv)
  await processCrdWrapper(argv)
  const skipKinds = ['CustomResourceDefinition']
  const skipFilenames = ['crd']

  d.log('Validating resources')
  const verbose = argv.verbose ? ['-verbose'] : []
  d.info(`Schema Output Path: ${schemaOutputPath}`)
  d.info(`Skip kinds: ${skipKinds.join(', ')}`)
  d.info(`Skip Filenames: ${skipFilenames.join(', ')}`)
  d.info(`K8S Resource Path: ${k8sResourcesPath}`)
  d.info(`Schema location: file://${schemaOutputPath}`)
  const skipPatterns = skipFilenames.flatMap((filename) => ['-ignore-filename-pattern', filename])
  d.info(
    `Running command: kubeconform -skip ${skipKinds.join(
      ',',
    )} ${skipPatterns} -schema-location ${schemaOutputPath}/${vk8sVersion}-standalone/{{.ResourceKind}}{{.KindSuffix}}.json -summary -output json ${verbose} ${k8sResourcesPath}`,
  )

  const kubeconformOutput = await $`kubeconform -skip ${skipKinds.join(
    ',',
  )} ${skipPatterns} -schema-location ${schemaOutputPath}/${vk8sVersion}-standalone/{{.ResourceKind}}{{.KindSuffix}}.json -summary -output json ${verbose} ${k8sResourcesPath}`.nothrow()

  const parsedOutput = JSON.parse(kubeconformOutput.stdout)
  const { valid, invalid, errors, skipped } = parsedOutput.summary

  d.info(`${chalk.greenBright('TOTAL PASS')}: %s`, `${valid} files`)
  d.info(`${chalk.magentaBright('TOTAL SKIP')}: %s`, `${skipped} files`)
  d.info(`${chalk.yellowBright('TOTAL WARN')}: %s`, `${invalid} files`)
  d.info(`${chalk.redBright('TOTAL ERR')}: %s`, `${errors} files`)

  if (kubeconformOutput.exitCode !== 0) {
    const failedResources = parsedOutput.resources.filter((res) =>
      ['statusInvalid', 'statusError'].includes(res.status),
    )
    d.error('Kubeconform failed resources:')
    for (const resource of failedResources) {
      d.error(`${resource.name}: ${resource.msg}`)
    }
    throw new Error(`Template validation FAILED: ${kubeconformOutput.exitCode}`)
  }

  d.log('Template validation SUCCESS')
}

export const module = {
  command: cmdName,
  describe: 'Validate generated manifests against supported k8s versions/CRDs and best practices',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: BasicArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await validateTemplates()
  },
}
