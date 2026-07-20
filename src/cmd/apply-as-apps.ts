import {
  ApiException,
  ApiextensionsV1Api,
  CoreV1Api,
  PatchStrategy,
  setHeaderOptions,
  V1ResourceRequirements,
} from '@kubernetes/client-node'
import { mkdirSync, rmSync, statSync } from 'fs'
import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { appPatches, genericPatch } from 'src/applicationPatches.json'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import {
  appRevisionMatches,
  argoCdHasUnrecoverableErrors,
  k8s,
  patchArgoCdApp,
  patchContainerResourcesOfSts,
  restartStatefulSet,
} from 'src/common/k8s'
import { getFilename, getNames, loadYaml, objectToYaml } from 'src/common/utils'
import { getImageTagFromValues } from 'src/common/values'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { operatorEnv } from 'src/operator/validators'
import { Argv, CommandModule } from 'yargs'
import { ARGOCD_APP_DEFAULT_SYNC_POLICY, ARGOCD_APP_PARAMS } from '../common/constants'
import { env } from '../common/envalid'
import { getStoredGitRepoConfig } from '../common/git-config'

export const ARGOCD_APP_DEFAULT_LABEL = 'managed'
export const ARGOCD_APP_GITOPS_LABEL = 'generic-gitops'
export const ARGOCD_APP_GITOPS_NS_PREFIX = 'gitops-ns'
export const ARGOCD_APP_GITOPS_GLOBAL_NAME = 'gitops-global'

const LAST_APPLIED_ANNOTATION = 'kubectl.kubernetes.io/last-applied-configuration'
// JSON Patch requires '/' in key names to be escaped as '~1'
const LAST_APPLIED_PATCH_PATH = '/metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration'

export const stripOversizedLastAppliedAnnotations = async (
  deps = {
    getCrdApi: (): ApiextensionsV1Api => k8s.kc().makeApiClient(ApiextensionsV1Api),
    getCoreApi: (): CoreV1Api => k8s.core(),
  },
): Promise<void> => {
  const log = terminal('cmd:apply-as-apps:stripOversized')
  const patchHeaders = setHeaderOptions('Content-Type', PatchStrategy.JsonPatch)
  const removePatch = [{ op: 'remove', path: LAST_APPLIED_PATCH_PATH }]

  const crdApi = deps.getCrdApi()
  const { items: crds } = await crdApi.listCustomResourceDefinition()
  await Promise.allSettled(
    crds
      .filter((crd) => {
        const value = crd.metadata?.annotations?.[LAST_APPLIED_ANNOTATION]
        return value !== undefined
      })
      .map(async (crd) => {
        const name = crd.metadata!.name!
        log.info(`Stripping oversized last-applied-configuration from CRD ${name}`)
        await crdApi.patchCustomResourceDefinition({ name, body: removePatch }, patchHeaders)
      }),
  )

  const coreApi = deps.getCoreApi()
  const { items: configMaps } = await coreApi.listConfigMapForAllNamespaces()
  await Promise.allSettled(
    configMaps
      .filter((cm) => {
        const value = cm.metadata?.annotations?.[LAST_APPLIED_ANNOTATION]
        return value !== undefined
      })
      .map(async (cm) => {
        const name = cm.metadata!.name!
        const namespace = cm.metadata!.namespace!
        log.info(`Stripping oversized last-applied-configuration from ConfigMap ${namespace}/${name}`)
        await coreApi.patchNamespacedConfigMap({ name, namespace, body: removePatch }, patchHeaders)
      }),
  )
}

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

export interface ArgocdAppManifest {
  apiVersion: 'argoproj.io/v1alpha1'
  kind: 'Application'
  metadata: {
    name: string
    namespace: string
    labels?: Record<string, string>
    annotations?: Record<string, string>
    finalizers?: string[]
  }
  spec: Record<string, any>
}

let customApi: ReturnType<typeof k8s.custom> | undefined

function getCustomApi(): ReturnType<typeof k8s.custom> {
  if (!customApi) {
    customApi = k8s.custom()
  }
  return customApi
}

export async function applyArgocdApp(app: ArgocdAppManifest): Promise<void> {
  await getCustomApi().patchNamespacedCustomObject(
    {
      ...ARGOCD_APP_PARAMS,
      name: app.metadata.name,
      body: app,
      fieldManager: 'apl-operator',
      force: true,
    },
    setHeaderOptions('Content-Type', PatchStrategy.ServerSideApply),
  )
}

const getAppName = (release: HelmRelease): string => {
  return `${release.namespace}-${release.name}`
}

export const mergeSyncOptions = (base: string[], patch?: string[]): string[] => {
  return [...new Set([...base, ...(patch ?? [])])]
}

const getArgoCdAppManifest = (name: string, appLabel: string, spec: Record<string, any>): ArgocdAppManifest => {
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name,
      labels: {
        'otomi.io/app': appLabel,
      },
      namespace: 'argocd',
      annotations: {
        'argocd.argoproj.io/compare-options': 'ServerSideDiff=true,IncludeMutationWebhook=true',
      },
      finalizers: ['resources-finalizer.argocd.argoproj.io'],
    },
    spec,
  }
}

export const getArgocdCoreAppManifest = (
  release: HelmRelease,
  values: Record<string, any>,
  otomiVersion: string,
): ArgocdAppManifest => {
  const name = getAppName(release)
  const { syncPolicy: patchSyncPolicy, ...restPatch } = (appPatches[name] || genericPatch) as Record<string, any>
  const syncPolicy = {
    ...ARGOCD_APP_DEFAULT_SYNC_POLICY,
    ...patchSyncPolicy,
    syncOptions: mergeSyncOptions(ARGOCD_APP_DEFAULT_SYNC_POLICY.syncOptions, patchSyncPolicy?.syncOptions),
  }
  return getArgoCdAppManifest(name, ARGOCD_APP_DEFAULT_LABEL, {
    syncPolicy,
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
    ...restPatch,
  })
}

export const getArgocdGitopsManifest = (name: string, repoURL: string, branch: string, targetNamespace?: string) => {
  const syncPolicy = {
    automated: {
      selfHeal: true,
      prune: false,
    },
    syncOptions: ['ServerSideApply=true', 'RespectIgnoreDifferences=true'],
  }
  if (targetNamespace) {
    syncPolicy.automated.prune = true
    syncPolicy.syncOptions.push('CreateNamespace=true')
  }
  const path = targetNamespace
    ? `${operatorEnv.GITOPS_NS_MANIFESTS_RELATIVE_PATH}/${targetNamespace}`
    : operatorEnv.GITOPS_GLOBAL_MANIFESTS_RELATIVE_PATH
  return getArgoCdAppManifest(name, ARGOCD_APP_GITOPS_LABEL, {
    project: 'default',
    syncPolicy,
    sources: [
      {
        path,
        repoURL,
        targetRevision: branch,
        directory: {
          recurse: true,
        },
      },
    ],
    destination: {
      server: 'https://kubernetes.default.svc',
      namespace: targetNamespace,
    },
  })
}

const setFinalizers = async (name: string) => {
  try {
    d.info(`Setting finalizers for ${name}`)
    await getCustomApi().patchNamespacedCustomObject(
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

const getFinalizers = async (name: string): Promise<string[] | undefined> => {
  try {
    const response = await getCustomApi().getNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      name,
    })
    const app = response.body as any
    return Array.isArray(app.metadata?.finalizers) ? app.metadata.finalizers : []
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      return undefined
    }
    d.warn(`Failed to get finalizers for ${name}: ${error}`)
    return []
  }
}

export const removeApplication = async (name: string): Promise<void> => {
  try {
    const finalizers = await getFinalizers(name)
    if (finalizers === undefined) {
      return
    }
    if (!finalizers.includes('resources-finalizer.argocd.argoproj.io')) {
      await setFinalizers(name)
    }
    await getCustomApi().deleteNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      name,
    })
    d.info(`Deleted application ${name}`)
  } catch (e) {
    if (!(e instanceof ApiException && e.code === 404)) {
      d.error(`Failed to delete application ${name}: ${e.message}`)
    }
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

async function patchArgocdResources(values: Record<string, any>) {
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

export const getApplications = async (
  labelSelector: string | undefined = `otomi.io/app=${ARGOCD_APP_DEFAULT_LABEL}`,
): Promise<ArgocdAppManifest[]> => {
  try {
    const response = await getCustomApi().listNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      labelSelector,
    })
    return response.items || []
  } catch (error) {
    d.error(`Failed to list applications: ${error}`)
    return []
  }
}

const readAppValues = async (release: HelmRelease): Promise<Record<string, any>> => {
  const appName = `${release.namespace}-${release.name}`
  const valuesPath = `${valuesDir}/${appName}.yaml`
  return (await loadYaml(valuesPath, { noError: true })) || {}
}

const createArgocdAppManifest = async (release: HelmRelease, otomiVersion: string): Promise<ArgocdAppManifest> => {
  const values = await readAppValues(release)
  return getArgocdCoreAppManifest(release, values, otomiVersion)
}

const getAplOperatorValues = async (): Promise<string> => {
  await hf({
    labelOpts: ['name=apl-operator'],
    logLevel: logLevelString(),
    args: ['write-values', `--output-file-template=${valuesDir}/{{.Release.Namespace}}-{{.Release.Name}}.yaml`],
  })
  return await readFile(`${valuesDir}/apl-operator-apl-operator.yaml`, 'utf-8')
}

export const updateOperatorApplication = async (expectedRevision: string): Promise<boolean> => {
  d.info('Checking running revision of apl-operator...')
  try {
    const operatorRevisionMatches = await appRevisionMatches(
      'apl-operator-apl-operator',
      expectedRevision,
      k8s.custom(),
    )
    if (operatorRevisionMatches) {
      d.info(`Expected revision ${expectedRevision} found for apl-operator.`)
      return false
    } else {
      const values = await getAplOperatorValues()
      d.info(`Updating apl-operator application to revision ${expectedRevision}.`)
      await patchArgoCdApp('apl-operator-apl-operator', expectedRevision, values, k8s.custom())
      return true
    }
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      d.info('apl-operator application not found, continuing')
      return false
    } else {
      throw error
    }
  }
}

export const checkArgoCdController = async (
  applications: ArgocdAppManifest[],
  releases: HelmRelease[],
): Promise<void> => {
  try {
    const argoCdErrorApp = argoCdHasUnrecoverableErrors(applications)
    if (argoCdErrorApp) {
      d.info(`Unrecoverable error condition detected in application ${argoCdErrorApp}. Restarting controller...`)
      await restartStatefulSet('argocd-application-controller', 'argocd')
    } else {
      const argoCdRelease = releases.find((release: HelmRelease) => release.name === 'argocd')
      if (argoCdRelease) {
        const argoCdValues = await readAppValues(argoCdRelease)
        if (argoCdValues) {
          await patchArgocdResources(argoCdValues)
        }
      }
    }
  } catch (error) {
    d.warn(error)
  }
}

export const applyAsApps = async (argv: HelmArguments): Promise<void> => {
  const helmfileSource = argv.file?.toString() || 'helmfile.d/'
  d.info(`Parsing helm releases defined in ${helmfileSource}`)
  setup()
  await stripOversizedLastAppliedAnnotations().catch((e) => d.warn('Failed to strip oversized annotations:', e))
  const otomiVersion = await getImageTagFromValues()
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
  const currentApplicationNames = getNames(currentApplications)

  await checkArgoCdController(currentApplications, releases)

  const manifestsToApply: ArgocdAppManifest[] = []

  await Promise.allSettled(
    releases.map(async (release: HelmRelease) => {
      try {
        // Skip apl-operator when NODE_ENV is development
        if (process.env.NODE_ENV === 'development' && release.name === 'apl-operator') {
          d.info(`Skipping apl-operator application in development mode`)
          return
        }

        if (release.installed) {
          const manifest = await createArgocdAppManifest(release, otomiVersion)
          manifestsToApply.push(manifest)
        } else {
          const appName = getAppName(release)
          if (currentApplicationNames.includes(appName)) {
            await removeApplication(appName)
          }
        }
      } catch (e) {
        errors.push(e)
      }
    }),
  )

  d.info(`Applying ${manifestsToApply.length} ArgoCD applications`)
  const applyResults = await Promise.allSettled(
    manifestsToApply.map(async (manifest) => {
      try {
        await applyArgocdApp(manifest)
        d.debug(`Applied application ${manifest.metadata.name}`)
      } catch (e) {
        d.error(`Failed to apply application ${manifest.metadata.name}: ${e}`)
        throw e
      }
    }),
  )

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
}

export const addGitOpsApps = async (
  appNames: Set<string>,
  namespaceDirs: string[],
  deps = { getArgocdGitopsManifest, applyArgocdApp, getStoredGitRepoConfig },
): Promise<void> => {
  d.info(`Adding GitOps apps: ${Array.from(appNames).join(', ')}`)
  const { repoUrl, branch } = await deps.getStoredGitRepoConfig(true)
  if (appNames.has(ARGOCD_APP_GITOPS_GLOBAL_NAME)) {
    d.debug('Creating GitOps apps for cluster resources')
    const appManifest = deps.getArgocdGitopsManifest(ARGOCD_APP_GITOPS_GLOBAL_NAME, repoUrl, branch)
    try {
      await deps.applyArgocdApp(appManifest)
    } catch (e) {
      d.error('Failed to create GitOps app for cluster resources', e)
    }
  }
  await Promise.allSettled(
    namespaceDirs.map(async (dirName) => {
      const appName = `${ARGOCD_APP_GITOPS_NS_PREFIX}-${dirName}`
      if (appNames.has(appName)) {
        d.debug(`Creating GitOps app for ${dirName}`)
        const appManifest = deps.getArgocdGitopsManifest(appName, repoUrl, branch, dirName)
        try {
          await deps.applyArgocdApp(appManifest)
        } catch (e) {
          d.error(`Failed to create GitOps app for ${dirName}:`, e)
        }
      }
    }),
  )
}

export const removeGitOpsApps = async (appNames: Set<string>) => {
  d.info(`Removing GitOps apps: ${Array.from(appNames).join(', ')}`)
  await Promise.allSettled(
    appNames.values().map(async (appName) => {
      d.debug(`Removing GitOps app ${appName}`)
      try {
        await getCustomApi().deleteNamespacedCustomObject({
          ...ARGOCD_APP_PARAMS,
          name: appName,
        })
      } catch (e) {
        d.error(`Failed to delete GitOps app ${appName}:`, e)
      }
    }),
  )
}

export const calculateGitOpsAppsSyncState = async (
  deps = { getApplications },
): Promise<{ toRemove: Set<string>; namespaceDirs: string[]; requiredGitOpsApps: Set<string> }> => {
  const envDir = env.ENV_DIR
  const namespaceListing = await glob(`${envDir}/${operatorEnv.GITOPS_NS_MANIFESTS_RELATIVE_PATH}/*`, {
    withFileTypes: true,
  })
  const namespaceDirs = namespaceListing.filter((path) => path.isDirectory()).map((path) => path.name)
  const existingGitOpsApps = new Set(getNames(await deps.getApplications(`otomi.io/app=${ARGOCD_APP_GITOPS_LABEL}`)))

  const requiredGitOpsApps = new Set(namespaceDirs.map((dirName) => `${ARGOCD_APP_GITOPS_NS_PREFIX}-${dirName}`))
  const globalPath = statSync(`${envDir}/${operatorEnv.GITOPS_GLOBAL_MANIFESTS_RELATIVE_PATH}`, {
    throwIfNoEntry: false,
  })
  if (globalPath && globalPath.isDirectory()) {
    requiredGitOpsApps.add(ARGOCD_APP_GITOPS_GLOBAL_NAME)
  }
  const toRemove = existingGitOpsApps.difference(requiredGitOpsApps)
  // Never remove the global app — warn instead if its directory is gone
  const globalAppExists = toRemove.delete(ARGOCD_APP_GITOPS_GLOBAL_NAME)
  if (globalAppExists) {
    d.warn(
      `ArgoCD application "${ARGOCD_APP_GITOPS_GLOBAL_NAME}" exists, but points to a nonexistent directory. ` +
        'Please consider removing it manually if not needed.',
    )
  }
  return {
    toRemove,
    namespaceDirs,
    requiredGitOpsApps,
  }
}

export const applyGitOpsApps = async (
  deps = { calculateGitOpsAppsSyncState, addGitOpsApps, removeGitOpsApps },
): Promise<void> => {
  d.info('Applying GitOps apps')
  const { toRemove, namespaceDirs, requiredGitOpsApps } = await deps.calculateGitOpsAppsSyncState()
  await deps.addGitOpsApps(requiredGitOpsApps, namespaceDirs)
  if (toRemove.size > 0) {
    await deps.removeGitOpsApps(toRemove)
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
    await applyGitOpsApps()
  },
}
