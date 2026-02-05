import { RuntimeUpgradeContext } from './runtime-upgrades'
import { createUpdateGenericSecret, getK8sSecret, k8s } from '../k8s'
import { GIT_CONFIG_NAMESPACE, GIT_CONFIG_SECRET_NAME, setGitConfig } from '../git-config'
import { hfValues } from '../hf'

export async function migrateGitConfig(context: RuntimeUpgradeContext) {
  context.debug.info('Create apl-git-config ConfigMap and apl-git-credentials Secret if not present')
  const secretData = await getK8sSecret('gitea-credentials', GIT_CONFIG_NAMESPACE)

  const defaultValues = (await hfValues({ defaultValues: true })) as Record<string, any>
  const otomiGit = defaultValues?.otomi?.git

  await createUpdateGenericSecret(k8s.core(), GIT_CONFIG_SECRET_NAME, GIT_CONFIG_NAMESPACE, {
    username: secretData?.GIT_USERNAME,
    password: secretData?.GIT_PASSWORD,
  })
  await setGitConfig({
    repoUrl: otomiGit?.repoUrl,
    branch: otomiGit?.branch,
    email: otomiGit?.email,
  })
}
