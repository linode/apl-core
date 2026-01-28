import {
  ApiException,
  KubernetesObject,
  PatchStrategy,
  setHeaderOptions,
  V1ResourceRequirements,
} from '@kubernetes/client-node'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { readFile } from 'fs/promises'
import { appPatches, genericPatch } from 'src/applicationPatches.json'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import { appRevisionMatches, k8s, patchArgoCdApp, patchContainerResourcesOfSts } from 'src/common/k8s'
import { getFilename, loadYaml } from 'src/common/utils'
import { getImageTagFromValues, objectToYaml } from 'src/common/values'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv, CommandModule } from 'yargs'
import { ARGOCD_APP_DEFAULT_SYNC_POLICY, ARGOCD_APP_PARAMS } from '../common/constants'
import { env } from '../common/envalid'

const cmdName = getFilename(__filename)
const dir = '/tmp/otomi'
const valuesDir = '/tmp/otomi/values'
const d = terminal(`cmd:${cmdName}:apply-as-apps`)
const cleanup = (argv: HelmArguments): void => {
  if (argv.skipCleanup) return
  rmSync(dir, { recursive: true, force: true })
}

const setup = (): void => {
  const argv: HelmArguments = getParsedArgs()
  cleanupHandler(() => cleanup(argv))
  cleanup(argv)
  mkdirSync(dir, { recursive: true })
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

interface ApplicationManifest {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
    finalizers?: string[]
  }
  spec: Record<string, any>
}

const applyApplication = async (app: ApplicationManifest): Promise<void> => {
  await customApi.patchNamespacedCustomObject(
    {
      ...ARGOCD_APP_PARAMS,
      name: app.metadata.name,
      body: app,
      fieldManager: 'node-fetch',
      force: true,
    },
    setHeaderOptions('Content-Type', PatchStrategy.ServerSideApply),
  )
}
const customApi = k8s.custom()

const getAppName = (release: HelmRelease): string => {
  return `${release.namespace}-${release.name}`
}

const getArgocdAppManifest = (
  release: HelmRelease,
  values: Record<string, any>,
  otomiVersion: string,
): ApplicationManifest => {
  const name = getAppName(release)
  const patch = appPatches[name] || genericPatch
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name,
      labels: {
        'otomi.io/app': 'managed',
      },
      namespace: 'argocd',
      annotations: {
        'argocd.argoproj.io/compare-options': 'ServerSideDiff=true,IncludeMutationWebhook=true',
      },
      finalizers: ['resources-finalizer.argocd.argoproj.io'],
    },
    spec: {
      syncPolicy: ARGOCD_APP_DEFAULT_SYNC_POLICY,
      project: 'default',
      revisionHistoryLimit: 2,
      source: {
        path: release.chart.replace('../', ''),
        repoURL: env.APPS_REPO_URL,
        targetRevision: env.APPS_REVISION || otomiVersion,
        helm: {
          releaseName: release.name,
          values: objectToYaml(values),
        },
      },
      destination: {
        server: 'https://kubernetes.default.svc',
        namespace: release.namespace,
      },
      ...patch,
    },
  }
}

const setFinalizers = async (name: string) => {
  try {
    d.info(`Setting finalizers for ${name}`)
    await customApi.patchNamespacedCustomObject(
      {
        ...ARGOCD_APP_PARAMS,
        name,
        body: [
          {
            op: 'replace',
            path: '/metadata/finalizers',
            value: ['resources-finalizer.argocd.argoproj.io'],
          },
        ],
      },
      setHeaderOptions('Content-Type', PatchStrategy.JsonPatch),
    )
    d.info(`Set finalizers for ${name}`)
  } catch (error) {
    d.error(`Failed to set finalizers for ${name}: ${error}`)
    throw error
  }
}

const getFinalizers = async (name: string): Promise<string[]> => {
  try {
    const response = await customApi.getNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      name,
    })
    const app = response.body as any
    return Array.isArray(app.metadata?.finalizers) ? app.metadata.finalizers : []
  } catch (error) {
    d.warn(`Failed to get finalizers for ${name}: ${error}`)
    return []
  }
}

const removeApplication = async (name: string): Promise<void> => {
  try {
    const finalizers = await getFinalizers(name)
    if (!finalizers.includes('resources-finalizer.argocd.argoproj.io')) {
      await setFinalizers(name)
    }
    await customApi.deleteNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      name,
    })
    d.info(`Deleted application ${name}`)
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

export const getApplications = async (): Promise<string[]> => {
  try {
    const response = await customApi.listNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
    })
    const apps = response.items || []
    return apps
      .filter((app: KubernetesObject) => app.metadata?.name && app.metadata.name !== '')
      .map((app: KubernetesObject) => app.metadata!.name!)
  } catch (error) {
    d.error(`Failed to list applications: ${error}`)
    return []
  }
}

const createApplicationManifest = async (release: HelmRelease, otomiVersion: string): Promise<ApplicationManifest> => {
  const appName = `${release.namespace}-${release.name}`
  const valuesPath = `${valuesDir}/${appName}.yaml`
  let values = {}

  if (existsSync(valuesPath)) values = (await loadYaml(valuesPath)) || {}
  const manifest = getArgocdAppManifest(release, values, otomiVersion)

  await patchArgocdResources(release, values)

  return manifest
}

const getAplOperatorValues = async (): Promise<string> => {
  await hf({
    labelOpts: ['name=apl-operator'],
    logLevel: logLevelString(),
    args: ['write-values', `--output-file-template=${valuesDir}/{{.Release.Namespace}}-{{.Release.Name}}.yaml`],
  })
  return await readFile(`${valuesDir}/apl-operator-apl-operator.yaml`, 'utf-8')
}

export const applyAsApps = async (argv: HelmArguments): Promise<boolean> => {
  const helmfileSource = argv.file?.toString() || 'helmfile.d/'
  d.info(`Parsing helm releases defined in ${helmfileSource}`)
  setup()
  const otomiVersion = await getImageTagFromValues()
  try {
    const expectedRevision = env.APPS_REVISION || otomiVersion
    d.info('Checking running revision of apl-operator...')
    const operatorRevisionMatches = await appRevisionMatches(
      'apl-operator-apl-operator',
      env.APPS_REVISION || otomiVersion,
      k8s.custom(),
    )
    if (operatorRevisionMatches) {
      d.info(`Expected revision ${expectedRevision} found for apl-operator.`)
    } else {
      const values = await getAplOperatorValues()
      d.info(`Updating apl-operator application to revision ${expectedRevision}.`)
      await patchArgoCdApp('apl-operator-apl-operator', expectedRevision, values, k8s.custom())
      d.info('Skipping further updates until apl-operator has restarted.')
      return false
    }
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      d.info('apl-operator application not found, continuing')
    } else {
      throw error
    }
  }
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
  const currentApplications = await getApplications()

  // Collect manifests to apply and handle removals
  const manifestsToApply: ApplicationManifest[] = []

  await Promise.allSettled(
    releases.map(async (release: HelmRelease) => {
      try {
        // Skip apl-operator when NODE_ENV is development
        if (process.env.NODE_ENV === 'development' && release.name === 'apl-operator') {
          d.info(`Skipping apl-operator application in development mode`)
          return
        }

        if (release.installed) {
          const manifest = await createApplicationManifest(release, otomiVersion)
          manifestsToApply.push(manifest)
        } else {
          const appName = getAppName(release)
          if (currentApplications.includes(appName)) {
            await removeApplication(appName)
          }
        }
      } catch (e) {
        errors.push(e)
      }
    }),
  )

  // Apply all manifests using server-side apply
  d.info(`Applying ${manifestsToApply.length} ArgoCD applications`)
  const applyResults = await Promise.allSettled(
    manifestsToApply.map(async (manifest) => {
      try {
        await applyApplication(manifest)
        d.debug(`Applied application ${manifest.metadata.name}`)
      } catch (e) {
        d.error(`Failed to apply application ${manifest.metadata.name}: ${e}`)
        throw e
      }
    }),
  )

  // Collect apply errors
  applyResults.forEach((result) => {
    if (result.status === 'rejected') {
      errors.push(result.reason)
    }
  })

  if (errors.length === 0) d.info(`All applications have been deployed successfully`)
  else {
    errors.map((e) => d.error(e))
    d.error(`Not all applications have been deployed successfully`)
  }
  return true
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
