import { mkdirSync, rmdirSync } from 'fs'
import { pathExists } from 'fs-extra'
import { writeFile } from 'fs/promises'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import { patchContainerResourcesOfSts, isResourcePresent, k8s } from 'src/common/k8s'
import { getFilename, loadYaml } from 'src/common/utils'
import { getImageTag, objectToYaml } from 'src/common/values'
import { HelmArguments, getParsedArgs, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv, CommandModule } from 'yargs'
import { $ } from 'zx'
import { V1ResourceRequirements } from '@kubernetes/client-node/dist/gen/model/v1ResourceRequirements'

const cmdName = getFilename(__filename)
const dir = '/tmp/otomi'
const appsDir = '/tmp/otomi/apps'
const valuesDir = '/tmp/otomi/values'
const d = terminal(`cmd:${cmdName}:apply-as-apps`)
const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  rmdirSync(dir, { recursive: true })
}

const setup = (): void => {
  const argv: HelmArguments = getParsedArgs()
  cleanupHandler(() => cleanup(argv))
  mkdirSync(dir, { recursive: true })
  mkdirSync(appsDir, { recursive: true })
  mkdirSync(valuesDir, { recursive: true })
}

interface HelmRelease {
  name: string
  namespace: string
  enabled: boolean
  installed: boolean
  labels: string
  chart: string
  version: string
}
const getAppName = (release: HelmRelease): string => {
  return `${release.namespace}-${release.name}`
}

const getArgocdAppManifest = (release: HelmRelease, values: Record<string, any>, otomiVersion) => {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name: getAppName(release),
      labels: {
        'otomi.io/app': 'managed',
      },
      namespace: 'argocd',
      annotations: {
        'argocd.argoproj.io/compare-options': 'ServerSideDiff=true,IncludeMutationWebhook=true',
      },
    },
    spec: {
      syncPolicy: {
        syncOptions: ['ServerSideApply=true'],
      },
      project: 'default',
      source: {
        path: release.chart.replace('../', ''),
        repoURL: 'https://github.com/linode/apl-core.git',
        targetRevision: otomiVersion,
        helm: {
          releaseName: release.name,
          values: objectToYaml(values),
        },
      },
      destination: {
        server: 'https://kubernetes.default.svc',
        namespace: release.namespace,
      },
    },
  }
}

const setFinalizers = async (name: string) => {
  d.info(`Setting finalizers for ${name}`)
  const resPatch =
    await $`kubectl -n argocd patch application ${name} -p '{"metadata": {"finalizers": ["resources-finalizer.argocd.argoproj.io"]}}' --type merge`
  if (resPatch.exitCode !== 0) {
    throw new Error(`Failed to set finalizers for ${name}: ${resPatch.stderr}`)
  }
}

const getFinalizers = async (name: string): Promise<string[]> => {
  const res = await $`kubectl -n argocd get application ${name} -o jsonpath='{.metadata.finalizers}'`
  return res.stdout ? JSON.parse(res.stdout) : []
}

const removeApplication = async (release: HelmRelease): Promise<void> => {
  const name = getAppName(release)
  if (!(await isResourcePresent('application', name, 'argocd'))) return

  try {
    const finalizers = await getFinalizers(name)
    if (!finalizers.includes('resources-finalizer.argocd.argoproj.io')) {
      await setFinalizers(name)
    }
    const resDelete = await $`kubectl -n argocd delete application ${name}`
    d.info(resDelete.stdout.toString().trim())
  } catch (e) {
    d.error(`Failed to delete application ${name}: ${e.message}`)
  }
}

function getResources(values: Record<string, any>) {
  const config = values
  const resources: V1ResourceRequirements = {
    limits: {
      cpu: config.controller?.resources?.limits?.cpu,
      memory: config.controller?.resources?.limits?.memory,
    },
    requests: {
      cpu: config.controller?.resources?.requests?.cpu,
      memory: config.controller?.resources?.requests?.memory,
    },
  }
  return resources
}

async function patchArgocdResources(release: HelmRelease, values: Record<string, any>) {
  if (release.name === 'argocd') {
    const resources = getResources(values)
    await patchContainerResourcesOfSts(
      'argocd-application-controller',
      'argocd',
      'application-controller',
      resources,
      k8s.app(),
      k8s.core(),
      d,
    )
  }
}

const writeApplicationManifest = async (release: HelmRelease, otomiVersion: string): Promise<void> => {
  const appName = `${release.namespace}-${release.name}`
  const applicationPath = `${appsDir}/${appName}.yaml`
  const valuesPath = `${valuesDir}/${appName}.yaml`
  let values = {}

  if (await pathExists(valuesPath)) values = (await loadYaml(valuesPath)) || {}
  const manifest = getArgocdAppManifest(release, values, otomiVersion)
  await writeFile(applicationPath, objectToYaml(manifest))

  await patchArgocdResources(release, values)
}
export const applyAsApps = async (argv: HelmArguments): Promise<void> => {
  const helmfileSource = argv.file?.toString() || 'helmfile.d/'
  d.info(`Parsing helm releases defined in ${helmfileSource}`)
  setup()
  const otomiVersion = await getImageTag()

  const res = await hf({
    fileOpts: argv.file,
    labelOpts: argv.label,
    logLevel: logLevelString(),
    args: ['--output=json', 'list'],
  })

  d.info(`Writing values for helm releases defined in ${helmfileSource}`)

  await hf({
    fileOpts: argv.file,
    labelOpts: argv.label,
    logLevel: logLevelString(),
    args: ['write-values', `--output-file-template=${valuesDir}/{{.Release.Namespace}}-{{.Release.Name}}.yaml`],
  })
  const errors: Array<any> = []
  // Generate JSON object with all helmfile releases defined in helmfile.d
  const releases: [] = JSON.parse(res.stdout.toString())
  await Promise.allSettled(
    releases.map(async (release: HelmRelease) => {
      try {
        if (release.installed) await writeApplicationManifest(release, otomiVersion)
        else {
          await removeApplication(release)
        }
      } catch (e) {
        errors.push(e)
      }
    }),
  )

  d.info(`Applying Argocd Application from ${appsDir} directory`)
  try {
    const resApply = await $`kubectl apply --namespace argocd -f ${appsDir}`
    d.info(resApply.stdout.toString())
  } catch (e) {
    d.error(e)
    errors.push(e)
  }
  if (errors.length === 0) d.info(`All applications has been deployed successfully`)
  else {
    errors.map((e) => d.error(e))
    d.error(`Not all applications has been deployed successfully`)
  }
}

export const module: CommandModule = {
  command: cmdName,
  describe: 'Apply all, or supplied, k8s resources',
  builder: (parser: Argv): Argv => helmOptions(parser),

  handler: async (argv: HelmArguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment()
    await applyAsApps(argv)
  },
}
