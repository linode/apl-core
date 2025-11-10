import { ApiException } from '@kubernetes/client-node'
import { ARGOCD_APP_PARAMS, ObjectMetadataCollection } from '../constants'
import { getArgoCdApp, k8s, setArgoCdAppSync } from '../k8s'
import { RuntimeUpgradeContext } from './runtime-upgrades'

async function scaleDeployment(context: RuntimeUpgradeContext, namespace: string, name: string, replicas: number) {
  const d = context.debug
  d.log(`Scaling ${name} to ${replicas} replicas...`)
  try {
    await k8s.app().patchNamespacedDeploymentScale({
      name,
      namespace,
      body: { spec: { replicas } },
    })
    d.log(`Scaled ${namespace}/${name} to ${replicas} replicas.`)
  } catch (err) {
    d.error(`Failed to scale ${name}:`, (err as any).body || err)
  }
}

export async function pruneArgoCDImageUpdater(context: RuntimeUpgradeContext) {
  const d = context.debug
  const customApi = k8s.custom()
  const appApi = k8s.app()
  d.info('Removing old ArgoCD Image Updater deployment')

  try {
    const app = await getArgoCdApp('argocd-argocd-image-updater-artifacts', customApi)
    if (!app) {
      d.info('ArgoCD Image Updater application not found, skipping prune.')
      return
    }
  } catch (error) {
    if (error instanceof ApiException && error.code === 404) {
      d.error('Failed to get ArgoCD Image Updater application:', (error as any).body || error)
      return
    }
  }

  try {
    await setArgoCdAppSync('argocd-argocd-image-updater-artifacts', false, customApi)
  } catch (err) {
    d.error('Failed to disable sync for ArgoCD Image Updater application:', (err as any).body || err)
  }

  try {
    await customApi.deleteNamespacedCustomObject({
      ...ARGOCD_APP_PARAMS,
      name: 'argocd-argocd-image-updater-artifacts',
    })
  } catch (error) {
    if (!(error instanceof ApiException && error.code === 404)) {
      d.error('Failed to delete old ArgoCD Image Updater application', error)
    }
  }
  try {
    await appApi.deleteNamespacedDeployment({ name: 'argocd-image-updater', namespace: 'argocd' })
  } catch (error) {
    if (!(error instanceof ApiException && error.code === 404)) {
      d.error('Failed to delete old ArgoCD Image Updater deployment', error)
    }
  }
}

export async function detachApplicationFromApplicationSet(context: RuntimeUpgradeContext) {
  const d = context.debug
  const namespace = 'argocd'
  const customApi = k8s.custom()

  // Do not sync ArgoCD while performing the cleanup
  await setArgoCdAppSync('argocd-argocd', false, customApi)
  await scaleDeployment(context, 'argocd', 'argocd-applicationset-controller', 0)

  // Step 1: Get all ApplicationSets
  const appSets: ObjectMetadataCollection = await customApi.listNamespacedCustomObject({
    group: 'argoproj.io',
    version: 'v1alpha1',
    namespace,
    plural: 'applicationsets',
  })

  const appSetNames = appSets.items.map((i: any) => i.metadata.name)
  d.log(`Found ApplicationSets: ${appSetNames.join(', ')}`)

  // Step 2: Get all Applications
  const apps: ObjectMetadataCollection = await customApi.listNamespacedCustomObject({
    group: 'argoproj.io',
    version: 'v1alpha1',
    namespace,
    plural: 'applications',
  })

  // Step 3: Remove ownerReferences pointing to ApplicationSets
  for (const app of apps.items) {
    const { name, ownerReferences } = app.metadata
    if (!ownerReferences) continue
    if (!name.startsWith('team-')) continue

    const filteredOwners = ownerReferences.filter((ref: any) => ref.kind !== 'ApplicationSet')

    if (filteredOwners.length !== ownerReferences.length) {
      d.log(`Detaching ApplicationSet from Application: ${name}`)

      app.metadata.ownerReferences = filteredOwners

      try {
        await customApi.patchNamespacedCustomObject({
          group: 'argoproj.io',
          version: 'v1alpha1',
          namespace,
          plural: 'applications',
          name,
          body: [{ op: 'replace', path: '/metadata/ownerReferences', value: filteredOwners }],
        })
      } catch (err) {
        d.error(`Failed to patch Application ${name}:`, (err as any).body || err)
      }
    }
  }

  // Step 4: Delete all ApplicationSets
  for (const appSetName of appSetNames) {
    d.log(`Deleting ApplicationSet: ${appSetName}`)
    try {
      await customApi.deleteNamespacedCustomObject({
        group: 'argoproj.io',
        version: 'v1alpha1',
        namespace,
        plural: 'applicationsets',
        name: appSetName,
      })
    } catch (err) {
      d.error(`Failed to delete ApplicationSet ${appSetName}:`, (err as any).body || err)
    }
  }

  await setArgoCdAppSync('argocd-argocd', true, customApi)
  d.log('Cleanup complete: ApplicationSets removed, Applications retained.')
}
