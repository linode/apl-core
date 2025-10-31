import { DiscoveryV1Api } from '@kubernetes/client-node'
import retry from 'async-retry'
import { existsSync } from 'fs'
import { rm } from 'fs/promises'
import { bootstrapGit, setIdentity } from 'src/common/bootstrap'
import { prepareEnvironment } from 'src/common/cli'
import { encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { env, isCi } from 'src/common/envalid'
import { hfValues } from 'src/common/hf'
import { createUpdateGenericSecret, k8s, waitTillGitRepoAvailable } from 'src/common/k8s'
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

const isConflictError = (error: any): boolean => {
  const errorMsg = error?.message?.toLowerCase() || ''
  return (
    errorMsg.includes('failed to merge') ||
    errorMsg.includes('resolve your current index first') ||
    errorMsg.includes('you need to resolve') ||
    errorMsg.includes('merge conflict')
  )
}

const cleanupGitState = async (d: any): Promise<void> => {
  try {
    cd(env.ENV_DIR)
    // Try to abort any ongoing merge or rebase
    await $`git merge --abort`.nothrow().quiet()
    await $`git rebase --abort`.nothrow().quiet()
    // Reset to the commit before our failed commit to discard local changes
    await $`git reset --hard HEAD~1`.quiet()
    d.info('Git state cleaned up after conflict - local commit discarded, reconciliation will retry')
  } catch (cleanupError) {
    d.warn('Error during git cleanup:', cleanupError?.message)
  }
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
        } catch {
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
      } catch (pullPushError) {
        // Check if this is a merge conflict - if so, skip the commit
        if (isConflictError(pullPushError)) {
          d.warn(
            'Merge conflict detected during pull/push. Cleaning up and skipping commit - reconciliation will retry.',
          )
          await cleanupGitState(d)
          return // Exit successfully, letting reconciliation handle the retry
        }

        // For other errors, continue with retry logic
        const errorMsg = 'Could not pull and push. Retrying...'
        d.error(errorMsg, pullPushError?.message?.replace(password, '****'))
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
  const retryOptions = {
    retries: env.RETRIES,
    randomize: env.RANDOM,
    minTimeout: env.MIN_TIMEOUT,
    factor: env.FACTOR,
  }
  try {
    // Check if the tag exists in the remote Gitea repository
    const tagExists = await $`git ls-remote --tags ${giteaChartsUrl} refs/tags/${tag}`
    if (tagExists.stdout.trim()) {
      d.info(`Tag '${tag}' already exists in Gitea. Skipping clone and initialization steps.`)
      return
    }
    d.info(`Cloning apl-charts at tag '${tag}' from upstream`)
    await $`mkdir -p ${workDir}`
    await retry(
      async () => {
        await $`git clone --branch ${tag} --depth 1 ${otomiChartsUrl} ${workDir}`.quiet()
      },
      {
        ...retryOptions,
        onRetry: async () => {
          d.warn('Failed to clone from external charts repo. Retrying...')
        },
      },
    )

    cd(workDir)
    await $`rm -rf .git`
    await $`rm -rf .github`
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
    await retry(
      async () => {
        await $`git push -u origin refs/heads/main`.quiet()
        await $`git push origin refs/tags/${tag}`.quiet()
      },
      {
        ...retryOptions,
        onRetry: async () => {
          d.warn('Failed to push to charts repo. Retrying...')
        },
      },
    )
  } catch (error) {
    d.info('cloneOtomiChartsInGitea Error ', error?.message?.replace(password, '****'))
  }
  d.info(`Cloned apl-charts at tag '${tag}' in Gitea`)
}

export async function retryIsOAuth2ProxyRunning() {
  const d = terminal(`cmd:${cmdName}:isOAuth2ProxyRunning`)
  await retry(
    async () => {
      await isOAuth2ProxyAvailable(k8s.discovery())
    },
    { retries: env.RETRIES, randomize: env.RANDOM, minTimeout: env.MIN_TIMEOUT, factor: env.FACTOR },
  ).catch((e) => {
    d.error('Error checking if OAuth2Proxy is ready:', e)
    throw e
  })
}

export async function isOAuth2ProxyAvailable(discoveryV1Api: DiscoveryV1Api): Promise<void> {
  const endpointSlices = await discoveryV1Api.listNamespacedEndpointSlice({
    namespace: 'istio-system',
    labelSelector: 'kubernetes.io/service-name=oauth2-proxy',
  })

  if (!endpointSlices || !endpointSlices.items || endpointSlices.items.length === 0) {
    throw new Error('OAuth2Proxy EndpointSlice not found, waiting...')
  }

  const hasReadyEndpoint = endpointSlices.items.some((slice) => {
    const endpoints = slice.endpoints
    if (!endpoints || endpoints.length === 0) {
      return false
    }

    return endpoints.some((endpoint) => {
      const isReady = endpoint.conditions?.ready === true
      const hasAddresses = endpoint.addresses && endpoint.addresses.length > 0
      return isReady && hasAddresses
    })
  })

  if (!hasReadyEndpoint) {
    throw new Error('OAuth2Proxy has no ready endpoints with addresses, waiting...')
  }
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
  await createUpdateGenericSecret(k8s.core(), secretName, 'keycloak', secretData)
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
