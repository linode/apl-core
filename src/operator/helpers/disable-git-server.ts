import { get } from 'lodash'
import { terminal } from '../../common/debug'
import { getArgoCdApp, k8s } from '../../common/k8s'
import { writeValues } from '../../common/values'

const d = terminal('operator:disable-git-server')

const GIT_SERVER_HOSTNAME = 'git-server.git-server.svc.cluster.local'

const ARGOCD_APPS_TO_CHECK = ['apl-operator-apl-operator', 'argocd-argocd', 'otomi-otomi-api']

export async function disableGitServerIfMigrated(
  values: Record<string, any>,
  deps = {
    getArgoCdApp,
    writeValues,
  },
): Promise<void> {
  if (get(values, 'apps.git-server.enabled') !== true) return

  const repoUrl: string = get(values, 'otomi.git.repoUrl', '')
  if (repoUrl.includes(GIT_SERVER_HOSTNAME)) return

  for (const appName of ARGOCD_APPS_TO_CHECK) {
    let app: any
    try {
      app = await deps.getArgoCdApp(appName, k8s.custom())
    } catch (err) {
      d.warn(`Failed to fetch ArgoCD app ${appName}, skipping git-server disable`, err)
      return
    }

    if (!app) {
      d.debug(`ArgoCD app ${appName} not found, skipping`)
      continue
    }

    const appRepoUrl: string = get(app, 'spec.source.repoURL', '')
    if (appRepoUrl.includes(GIT_SERVER_HOSTNAME)) {
      d.debug(`ArgoCD app ${appName} still points to git-server, skipping disable`)
      return
    }
  }

  d.info('Disabled git-server: BYO Git detected and all ArgoCD apps migrated')
  await deps.writeValues({ apps: { 'git-server': { enabled: false } } })
}
