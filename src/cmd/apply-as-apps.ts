import {
  ApiException,
  KubernetesObject,
  PatchStrategy,
  setHeaderOptions,
  V1ResourceRequirements,
} from '@kubernetes/client-node'
import { existsSync, statSync, mkdirSync, rmSync } from 'fs'
import { glob } from 'glob'
import { readFile, writeFile } from 'fs/promises'
import { appPatches, genericPatch } from 'src/applicationPatches.json'
import { cleanupHandler, prepareEnvironment } from 'src/common/cli'
import { logLevelString, terminal } from 'src/common/debug'
import { hf } from 'src/common/hf'
import { appRevisionMatches, k8s, patchArgoCdApp, patchContainerResourcesOfSts } from 'src/common/k8s'
import { getFilename, loadYaml } from 'src/common/utils'
import { getImageTagFromValues, objectToYaml } from 'src/common/values'
import { getParsedArgs, HelmArguments, helmOptions, setParsedArgs } from 'src/common/yargs'
import { Argv, CommandModule } from 'yargs'
import { $ } from 'zx'
import { ARGOCD_APP_DEFAULT_SYNC_POLICY, ARGOCD_APP_PARAMS } from '../common/constants'
import { env } from '../common/envalid'

export const GITOPS_MANIFESTS_NS_PATH = 'env/manifests/ns'
export const GITOPS_MANIFESTS_GLOBAL_PATH = 'env/manifests/global'
export const ARGOCD_APP_DEFAULT_LABEL = 'managed'
export const ARGOCD_APP_GITOPS_LABEL = 'generic-gitops'
export const ARGOCD_APP_GITOPS_NS_PREFIX = 'gitops-ns'
export const ARGOCD_APP_GITOPS_GLOBAL_NAME = 'gitops-global'

const cmdName = getFilename(__filename)
const dir = '/tmp/otomi'
const appsDir = '/tmp/otomi/apps'
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
const customApi = k8s.custom()

const getAppName = (release: HelmRelease): string => {
  return `${release.namespace}-${release.name}`
}

const getArgocdAppManifest = (release: HelmRelease, values: Record<string, any>, otomiVersion: string) => {
  const name = getAppName(release)
  const patch = appPatches[name] || genericPatch
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name,
      labels: {
        'otomi.io/app': ARGOCD_APP_DEFAULT_LABEL,
      },
      namespace: 'argocd',
      annotations: {
        'argocd.argoproj.io/compare-options': 'ServerSideDiff=true,IncludeMutationWebhook=true',
      },
    },
    spec: {
      syncPolicy: ARGOCD_APP_DEFAULT_SYNC_POLICY,
      project: 'default',
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

export const getArgocdGitopsManifest = (name: string, targetNamespace?: string) => {
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
  const repoURL = `${env.GIT_PROTOCOL}://${env.GIT_URL}:${env.GIT_PORT}/otomi/values.git`
  const path = targetNamespace ? `${GITOPS_MANIFESTS_NS_PATH}/${targetNamespace}` : GITOPS_MANIFESTS_GLOBAL_PATH
  return {
    apiVersion: 'argoproj.io/v1alpha1',
    kind: 'Application',
    metadata: {
      name,
      labels: {
        'otomi.io/app': ARGOCD_APP_GITOPS_LABEL,
      },
      annotations: {
        'argocd.argoproj.io/compare-options': 'ServerSideDiff=true,IncludeMutationWebhook=true',
      },
    },
    spec: {
      project: 'default',
      syncPolicy,
      sources: [
        {
          path,
          repoURL,
          targetRevision: 'HEAD',
        },
      ],
      destination: {
        server: 'https://kubernetes.default.svc',
        namespace: targetNamespace,
      },
    },
  }
}

export const createOrPatchArgoCdApp = async (manifest: Record<string, any>) => {
  try {
    await customApi.createNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      body: manifest,
    })
  } catch (error) {
    if (error instanceof ApiException) {
      d.debug(`ArgoCD application ${manifest.metadata.name} exists, patching.`)
      await customApi.patchNamespacedCustomObject({
        ...ARGOCD_APP_PARAMS,
        name: manifest.metadata.name,
        body: manifest,
      })
    } else {
      throw error
    }
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

export const removeApplication = async (name: string): Promise<void> => {
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

export const getApplications = async (
  labelSelector: string | undefined = `otomi.io/app=${ARGOCD_APP_DEFAULT_LABEL}`,
): Promise<string[]> => {
  try {
    const response = await customApi.listNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      labelSelector,
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

const writeApplicationManifest = async (release: HelmRelease, otomiVersion: string): Promise<void> => {
  const appName = `${release.namespace}-${release.name}`
  const applicationPath = `${appsDir}/${appName}.yaml`
  const valuesPath = `${valuesDir}/${appName}.yaml`
  let values = {}

  if (existsSync(valuesPath)) values = (await loadYaml(valuesPath)) || {}
  const manifest = getArgocdAppManifest(release, values, otomiVersion)
  await writeFile(applicationPath, objectToYaml(manifest))

  await patchArgocdResources(release, values)
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
  await Promise.allSettled(
    releases.map(async (release: HelmRelease) => {
      try {
        // Skip apl-operator when NODE_ENV is development
        if (process.env.NODE_ENV === 'development' && release.name === 'apl-operator') {
          d.info(`Skipping apl-operator application in development mode`)
          return
        }

        if (release.installed) await writeApplicationManifest(release, otomiVersion)
        else {
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

  d.info(`Applying Argocd Application from ${appsDir} directory`)
  try {
    const resApply = await $`kubectl apply --namespace argocd -f ${appsDir}`.quiet()
    d.debug(resApply.stdout.toString())
  } catch (e) {
    d.error(e)
    errors.push(e)
  }
  if (errors.length === 0) d.info(`All applications has been deployed successfully`)
  else {
    errors.map((e) => d.error(e))
    d.error(`Not all applications has been deployed successfully`)
  }
  return true
}

export const applyGitOpsApps = async (
  deps = { getApplications, getArgocdGitopsManifest, createOrPatchArgoCdApp, removeApplication },
): Promise<void> => {
  d.info('Applying GitOps apps')
  const envDir = env.ENV_DIR
  const namespaceListing = await glob(`${envDir}/${GITOPS_MANIFESTS_NS_PATH}/*`, { withFileTypes: true })
  const namespaceDirs = namespaceListing.filter((path) => path.isDirectory()).map((path) => path.name)
  const existingGitOpsApps = new Set(await deps.getApplications(`otomi.io/app=${ARGOCD_APP_GITOPS_LABEL}`))

  // First create sets of Applications to be updated
  const requiredGitOpsApps = new Set(namespaceDirs.map((dirName) => `${ARGOCD_APP_GITOPS_NS_PREFIX}-${dirName}`))
  const globalPath = statSync(`${envDir}/${GITOPS_MANIFESTS_GLOBAL_PATH}`)
  if (globalPath && globalPath.isDirectory()) {
    requiredGitOpsApps.add(ARGOCD_APP_GITOPS_GLOBAL_NAME)
  }
  const addGitOpsApps = requiredGitOpsApps.difference(existingGitOpsApps)
  const removeGitOpsApps = existingGitOpsApps.difference(requiredGitOpsApps)
  // Always create global resources app, but never remove it
  const globalAppExists = removeGitOpsApps.delete(ARGOCD_APP_GITOPS_GLOBAL_NAME)
  if (globalAppExists) {
    d.warn(
      `ArgoCD application "${ARGOCD_APP_GITOPS_GLOBAL_NAME}" exists, but points to a nonexistent directory. ` +
        'Please consider removing it manually if not needed.',
    )
  }

  if (addGitOpsApps.size > 0) {
    d.info(`Adding GitOps apps: ${addGitOpsApps}`)
    if (addGitOpsApps.has(ARGOCD_APP_GITOPS_GLOBAL_NAME)) {
      d.debug('Creating GitOps apps for cluster resources')
      const appManifest = deps.getArgocdGitopsManifest(ARGOCD_APP_GITOPS_GLOBAL_NAME)
      try {
        await deps.createOrPatchArgoCdApp(appManifest)
      } catch (e) {
        d.error('Failed to create GitOps app for cluster resources', e)
      }
    }
    await Promise.allSettled(
      namespaceDirs.map(async (dirName) => {
        const appName = `${ARGOCD_APP_GITOPS_NS_PREFIX}-${dirName}`
        if (addGitOpsApps.has(appName)) {
          d.debug(`Creating GitOps app for ${dirName}`)
          const appManifest = deps.getArgocdGitopsManifest(appName, dirName)
          try {
            await deps.createOrPatchArgoCdApp(appManifest)
          } catch (e) {
            d.error(`Failed to create GitOps app for ${dirName}:`, e)
          }
        }
      }),
    )
  }
  if (removeGitOpsApps.size > 0) {
    d.info(`Removing GitOps apps: ${removeGitOpsApps}`)
    await Promise.allSettled(
      removeGitOpsApps.values().map(async (appName) => {
        d.debug(`Removing GitOps app ${appName}`)
        await deps.removeApplication(appName)
      }),
    )
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
