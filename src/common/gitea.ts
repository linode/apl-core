import { exec, getK8sSecret, getPodsOfDeployment, k8s } from './k8s'
import { terminal } from './debug'
import retry from 'async-retry'
import { $, cd } from 'zx'
import { env } from './envalid'

export async function resetGiteaPasswordValidity() {
  const d = terminal(`common:gitea:resetGiteaPasswordValidity`)
  d.info('Resetting status of Gitea admin credentials')
  const giteaPods = await getPodsOfDeployment(k8s.app(), k8s.core(), 'gitea', 'gitea')
  const [firstPod] = giteaPods.items
  // In case Gitea pods happened to be restarting in the meantime, it will likely fix the issue by itself
  if (firstPod) {
    const giteaCredentialsSecret = await getK8sSecret('apl-git-credentials', 'apl-operator')
    const userName = giteaCredentialsSecret?.username ?? 'otomi-admin'
    const resetCmd = ['gitea', 'admin', 'user', 'must-change-password', '--unset', userName as string]
    const { stdout, stderr } = await exec(
      firstPod.metadata!.namespace as string,
      firstPod.metadata!.name as string,
      'gitea',
      resetCmd,
    )
    d.info(stderr, stdout)
  }
}

export const waitTillGitRepoAvailable = async (repoUrl: string): Promise<void> => {
  const d = terminal('common:gitea:waitTillGitRepoAvailable')
  await retry(
    async () => {
      try {
        cd(env.ENV_DIR)
        // the ls-remote exists with zero even if repo is empty
        await $`git ls-remote ${repoUrl}`
      } catch (e) {
        if (e.stderr && e.stderr.includes('remote: Update your password')) {
          await resetGiteaPasswordValidity()
          await $`git ls-remote ${repoUrl}`
        } else {
          d.warn(`The values repository is not yet reachable. Retrying in ${env.MIN_TIMEOUT} ms`)
          throw e
        }
      }
    },
    { retries: env.RETRIES, randomize: env.RANDOM, minTimeout: env.MIN_TIMEOUT, factor: env.FACTOR },
  )
}
