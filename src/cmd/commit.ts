import { CoreV1Api } from '@kubernetes/client-node'
import retry from 'async-retry'
import { existsSync } from 'fs'
import { rm } from 'fs/promises'
import { bootstrapGit, setIdentity } from 'src/common/bootstrap'
import { prepareEnvironment } from 'src/common/cli'
import { encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { env, isCi } from 'src/common/envalid'
import { hfValues } from 'src/common/hf'
import { createGenericSecret, k8s, waitTillGitRepoAvailable } from 'src/common/k8s'
import { getFilename, loadYaml } from 'src/common/utils'
import { getRepo } from 'src/common/values'
import { getParsedArgs, HelmArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { Arguments as DroneArgs } from './gen-drone'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

export const rootDir = process.cwd() === '/home/app/stack/env' ? '/home/app/stack' : process.cwd()

interface Arguments extends HelmArguments, DroneArgs {
  m?: string
  message?: string
}

interface InitialData {
  domainSuffix: string
  username: string
  password: string
  secretName: string
}

const commitAndPush = async (values: Record<string, any>, branch: string): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commitAndPush`)
  d.info('Committing values')
  const argv = getParsedArgs()
  const rerunRequested = existsSync(`${env.ENV_DIR}/.rerun`)
  const message = isCi ? 'updated values [ci skip]' : argv.message || 'otomi commit'
  const { password } = getRepo(values)
  cd(env.ENV_DIR)
  try {
    try {
      await $`git rev-list HEAD --count`.quiet()
    } catch {
      d.log('Very first commit')
      // We need at least two commits in repo, so git diff in Tekton pipeline always works. This is why  the very first time we commit twice.
      await $`git add README.md`.quiet()
      await $`git commit -m ${message} --no-verify`.quiet()
    }
    await $`git add -A`
    if (isCi && rerunRequested) {
      d.log('Committing changes and triggering pipeline run')
      await $`git commit -m "[apl-trigger]" --no-verify --allow-empty`.quiet()
    } else {
      // The below 'git status' command will always return at least single new line
      const filesChangedCount = (await $`git status --untracked-files=no --porcelain`).toString().split('\n').length - 1
      if (filesChangedCount === 0) {
        d.log('Nothing to commit')
        return
      }
      await $`git commit -m ${message} --no-verify`.quiet()
    }
  } catch (e) {
    d.log('commitAndPush error ', e?.message?.replace(password, '****'))
    return
  }
  if (values._derived?.untrustedCA) process.env.GIT_SSL_NO_VERIFY = '1'
  await retry(
    async () => {
      try {
        cd(env.ENV_DIR)
        // Check if remote branch exists
        let remoteBranchExists = true
        try {
          await $`git ls-remote --exit-code --heads origin ${branch}`.quiet()
        } catch (e) {
          remoteBranchExists = false
        }
        // We're not always sure that we are on the correct branch,
        // so we checkout the branch and create it if it does not exist
        await $`git checkout -B ${branch}`.quiet()

        if (remoteBranchExists) {
          await $`git pull --rebase origin ${branch}`.quiet()
        } else {
          d.log(`Remote branch '${branch}' does not exist. Skipping pull.`)
        }
        await $`git push -u origin ${branch}`.quiet()
      } catch (e) {
        const errorMsg = 'Could not pull and push. Retrying...'
        d.error(errorMsg, e?.message?.replace(password, '****'))
        throw new Error(errorMsg)
      }
    },
    {
      retries: 20,
      maxTimeout: 30000,
    },
  )
  if (rerunRequested) {
    await rm(`${env.ENV_DIR}/.rerun`, { force: true })
  }
  d.log('Successfully pushed the updated values')
}

export const commit = async (initialInstall: boolean, overrideArgs?: HelmArguments): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commit`)
  await validateValues(overrideArgs)
  d.info('Preparing values')
  const values = (await hfValues()) as Record<string, any>
  const { branch, remote, username, email } = getRepo(values)
  if (initialInstall) {
    // we call this here again, as we might not have completed (happens upon first install):
    await bootstrapGit(values)
  } else {
    cd(env.ENV_DIR)
    await setIdentity(username, email)
    // the url might need updating (e.g. if credentials changed)
    await $`git remote set-url origin ${remote}`
  }
  // let's wait until the remote is ready
  if (values?.apps!.gitea!.enabled ?? true) {
    await waitTillGitRepoAvailable(remote)
  }
  // continue
  await encrypt()
  await commitAndPush(values, branch)
}

export const cloneOtomiChartsInGitea = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:gitea-apl-charts`)
  const versions = await loadYaml(`${rootDir}/versions.yaml`, { noError: true })
  const tag = versions?.aplCharts
  d.info(`Checking if apl-charts tag '${tag}' already exists in Gitea`)
  const values = (await hfValues()) as Record<string, any>
  const { email, username, password } = getRepo(values)
  const workDir = '/tmp/apl-charts'
  const otomiChartsUrl = env.OTOMI_CHARTS_URL
  const giteaChartsUrl = `http://${username}:${password}@gitea-http.gitea.svc.cluster.local:3000/otomi/charts.git`
  try {
    // Check if the tag exists in the remote Gitea repository
    const tagExists = await $`git ls-remote --tags ${giteaChartsUrl} refs/tags/${tag}`
    if (tagExists.stdout.trim()) {
      d.info(`Tag '${tag}' already exists in Gitea. Skipping clone and initialization steps.`)
      return
    }
    d.info(`Cloning apl-charts at tag '${tag}' from upstream`)
    await $`mkdir -p ${workDir}`
    await $`git clone --branch ${tag} --depth 1 ${otomiChartsUrl} ${workDir}`.quiet()
    cd(workDir)
    await $`rm -rf .git`
    await $`rm -rf deployment`
    await $`rm -rf ksvc`
    await $`rm -rf icons`
    await $`rm -rf .vscode`
    await $`rm -f .gitignore`
    await $`rm -f LICENSE`
    await $`git init`
    await setIdentity(username, email)
    await $`git add .`
    await $`git commit -m "first commit for tag ${tag}"`
    await $`git branch -M main`
    await $`git tag ${tag}`
    await $`git remote add origin ${giteaChartsUrl}`
    await $`git config http.sslVerify false`
    await $`git push -u origin main`.quiet()
    await $`git push origin tags/${tag}`.quiet()
  } catch (error) {
    d.info('cloneOtomiChartsInGitea Error ', error?.message?.replace(password, '****'))
  }
  d.info(`Cloned apl-charts at tag '${tag}' in Gitea`)
}

export async function retryIsOAuth2ProxyRunning() {
  const d = terminal(`cmd:${cmdName}:isOAuth2ProxyRunning`)
  await retry(
    async () => {
      await isOAuth2ProxyAvailable(k8s.core())
    },
    { retries: env.RETRIES, randomize: env.RANDOM, minTimeout: env.MIN_TIMEOUT, factor: env.FACTOR },
  ).catch((e) => {
    d.error('Error checking if OAuth2Proxy is ready:', e)
    throw e
  })
}

export async function isOAuth2ProxyAvailable(coreV1Api: CoreV1Api): Promise<void> {
  const d = terminal(`cmd:${cmdName}:isOAuth2ProxyRunning`)
  d.info('Checking if OAuth2Proxy is available, waiting...')
  const oauth2ProxyEndpoint = await coreV1Api.readNamespacedEndpoints({
    name: 'oauth2-proxy',
    namespace: 'istio-system',
  })
  if (!oauth2ProxyEndpoint) {
    throw new Error('OAuth2Proxy endpoint not found, waiting...')
  }
  const oauth2ProxySubsets = oauth2ProxyEndpoint.subsets
  if (!oauth2ProxySubsets || oauth2ProxySubsets.length < 1) {
    throw new Error('OAuth2Proxy has no subsets, waiting...')
  }
  const oauth2ProxyAddresses = oauth2ProxySubsets[0].addresses

  if (!oauth2ProxyAddresses || oauth2ProxyAddresses.length < 1) {
    throw new Error('OAuth2Proxy has no available addresses, waiting...')
  }
  d.info('OAuth2proxy is available, continuing...')
}

export async function initialSetupData(): Promise<InitialData> {
  const values = (await hfValues()) as Record<string, any>
  const { domainSuffix } = values.cluster
  const { hasExternalIDP } = values.otomi

  const defaultPlatformAdminEmail = `platform-admin@${domainSuffix}`
  const platformAdmin = values.users.find((user: any) => user.email === defaultPlatformAdminEmail)
  const secretName = hasExternalIDP ? 'root-credentials' : 'platform-admin-initial-credentials'

  if (platformAdmin && !hasExternalIDP) {
    return {
      domainSuffix,
      username: platformAdmin.email,
      password: platformAdmin.initialPassword,
      secretName,
    }
  } else {
    return {
      domainSuffix,
      username: values.apps.keycloak.adminUsername,
      password: values.apps.keycloak.adminPassword,
      secretName,
    }
  }
}

export async function createCredentialsSecret(secretName: string, username: string, password: string): Promise<void> {
  const secretData = { username, password }
  await createGenericSecret(k8s.core(), secretName, 'keycloak', secretData)
}

export const printWelcomeMessage = async (secretName: string, domainSuffix: string): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commit`)
  const message = `
  ########################################################################################################################################
  #
  #  The App Platform console is available at https://console.${domainSuffix}
  #
  #  Obtain login credentials by using the below commands:
  #      kubectl get secret ${secretName} -n keycloak -o jsonpath='{.data.username}' | base64 -d
  #      kubectl get secret ${secretName} -n keycloak -o jsonpath='{.data.password}' | base64 -d
  #
  ########################################################################################################################################`
  d.info(message)
}

export const module = {
  command: cmdName,
  describe: 'Wrapper that validates values, generates the Drone pipeline and then commits and pushes changed files',
  builder: (parser: Argv): Argv =>
    parser.options({
      message: {
        alias: ['m'],
        type: 'string',
        hidden: true,
        describe: 'Commit message',
      },
    }),
  handler: async (argv: Arguments): Promise<void> => {
    setParsedArgs(argv)
    await prepareEnvironment({ skipKubeContextCheck: true })
    await commit(true, argv)
  },
}
