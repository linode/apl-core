import { k8s } from '../k8s'
import { RuntimeUpgradeContext } from '../runtime-upgrades/runtime-upgrades'

export const upgradeKnativeServing20 = async (context: RuntimeUpgradeContext) => {
  const group = 'operator.knative.dev'
  const version = 'v1beta1'
  const plural = 'knativeservings'
  const name = 'knative-serving'
  const namespace = 'knative-serving'
  const client = k8s.custom()

  try {
    // Check if CR exists
    try {
      await client.getNamespacedCustomObject({
        group,
        version,
        namespace,
        plural,
        name,
      })
    } catch {
      context.debug.info('KnativeServing CR not found, skipping upgrade.')
      return
    }

    for (const targetVersion of ['1.19', '1.20']) {
      context.debug.info(`Patching KnativeServing to ${targetVersion}...`)
      await client.patchNamespacedCustomObject({
        group,
        version,
        namespace,
        plural,
        name,
        body: [{ op: 'replace', path: '/spec/version', value: targetVersion }],
      })

      context.debug.info(`Waiting for Ready condition after ${targetVersion}...`)
      let ready = false
      for (let i = 0; i < 15; i++) {
        await new Promise((res) => setTimeout(res, 5000))
        try {
          const res: any = await client.getNamespacedCustomObject({
            group,
            version,
            namespace,
            plural,
            name,
          })
          const newVersion = (res.status?.version || '').split('.').slice(0, 2).join('.')
          const conditions = res.status?.conditions || []
          const readyCond = conditions.find((c: any) => c.type === 'Ready')

          if (readyCond?.status === 'True' && newVersion === targetVersion) {
            ready = true
            break
          }
        } catch {
          // Ignore transient errors
        }
      }

      if (!ready) {
        throw new Error(`Timeout waiting for KnativeServing to be Ready after upgrade to ${targetVersion}`)
      }

      context.debug.info(`Upgrade to ${targetVersion} completed.`)
    }
  } catch (err) {
    context.debug.error('KnativeServing upgrade failed:', err)
  }
}
