import { bootstrapGit, setIdentity } from 'src/common/bootstrap'
import { prepareEnvironment } from 'src/common/cli'
import { encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { env, isCi } from 'src/common/envalid'
import { hfValues } from 'src/common/hf'
import { createGenericSecret, waitTillGitRepoAvailable } from 'src/common/k8s'
import { getFilename } from 'src/common/utils'
import { getRepo } from 'src/common/values'
import { HelmArguments, getParsedArgs, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { Arguments as DroneArgs } from './gen-drone'
import { validateValues } from './validate-values'
import { AppsV1Api, CoreV1Api, CustomObjectsApi, KubeConfig } from '@kubernetes/client-node'
import retry from 'async-retry'

const cmdName = getFilename(__filename)

interface Arguments extends HelmArguments, DroneArgs {
  m?: string
  message?: string
}

const commitAndPush = async (values: Record<string, any>, branch: string): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commitAndPush`)
  d.info('Committing values')
  const argv = getParsedArgs()
  const message = isCi ? 'updated values [ci skip]' : argv.message || 'otomi commit'
  cd(env.ENV_DIR)
  try {
    try {
      await $`git rev-list HEAD --count`
    } catch {
      d.log('Very first commit')
      // We need at least two commits in repo, so git diff in Tekton pipeline always works. This is why  the very first time we commit twice.
      await $`git add README.md`
      await $`git commit -m ${message} --no-verify`
    }
    await $`git add -A`
    // The below 'git status' command will always return at least single new line
    const filesChangedCount = (await $`git status --untracked-files=no --porcelain`).toString().split('\n').length - 1
    if (filesChangedCount === 0) {
      d.log('Nothing to commit')
      return
    }
    await $`git commit -m ${message} --no-verify`
  } catch (e) {
    d.log(e)
    return
  }
  if (values._derived?.untrustedCA) process.env.GIT_SSL_NO_VERIFY = '1'
  d.log('git config:')
  await $`cat .git/config`
  await $`git push -u origin ${branch}`
  d.log('Successfully pushed the updated values')
}

export const commit = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commit`)
  await validateValues()
  d.info('Preparing values')
  const values = (await hfValues()) as Record<string, any>
  // we call this here again, as we might not have completed (happens upon first install):
  await bootstrapGit(values)
  const { branch, remote } = getRepo(values)
  // lets wait until the remote is ready
  if (values?.apps!.gitea!.enabled ?? true) {
    await waitTillGitRepoAvailable(remote)
  }
  // continue
  await encrypt()
  await commitAndPush(values, branch)
}

export const cloneOtomiChartsInGitea = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:gitea-apl-charts`)
  d.info('Cloning apl-charts in Gitea')
  const values = (await hfValues()) as Record<string, any>
  const { email, username, password } = getRepo(values)
  const workDir = '/tmp/apl-charts'
  const otomiChartsUrl = env.OTOMI_CHARTS_URL
  const giteaChartsUrl = `http://${username}:${password}@gitea-http.gitea.svc.cluster.local:3000/otomi/charts.git`
  try {
    await $`mkdir ${workDir}`
    await $`git clone --depth 1 ${otomiChartsUrl} ${workDir}`
    cd(workDir)
    await $`rm -rf .git`
    await $`rm -rf deployment`
    await $`rm -rf ksvc`
    await $`rm -rf icons`
    await $`rm -rf .vscode`
    await $`rm -f .gitignore`
    await $`rm -f LICENSE`
    await $`git init`
    await setIdentity(username, password, email)
    await $`git checkout -b main`
    await $`git add .`
    await $`git commit -m "first commit"`
    await $`git remote add origin ${giteaChartsUrl}`
    await $`git config http.sslVerify false`
    await $`git push -u origin main`
  } catch (error) {
    d.info('CloneOtomiChartsInGitea Error:', error)
  }
  d.info('Cloned apl-charts in Gitea')
}

export async function retryCheckingForPipelineRun() {
  const d = terminal(`cmd:${cmdName}:pipelineRun`)
  await retry(
    async () => {
      await checkIfPipelineRunExists()
    },
    { retries: env.RETRIES, randomize: env.RANDOM, minTimeout: env.MIN_TIMEOUT, factor: env.FACTOR },
  ).catch((e) => {
    d.error('Error retrieving PipelineRuns:', e)
    throw e
  })
}

export async function retryIsOAuth2ProxyRunning() {
  const d = terminal(`cmd:${cmdName}:isOAuth2ProxyRunning`)
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const appsV1Api = kc.makeApiClient(AppsV1Api)
  await retry(
    async () => {
      await isOAuth2ProxyRunning(appsV1Api)
    },
    { retries: env.RETRIES, randomize: env.RANDOM, minTimeout: env.MIN_TIMEOUT, factor: env.FACTOR },
  ).catch((e) => {
    d.error('Error checking if OAuth2Proxy is ready:', e)
    throw e
  })
}

export async function isOAuth2ProxyRunning(k8s: AppsV1Api): Promise<void> {
  const d = terminal(`cmd:${cmdName}:isOAuth2ProxyRunning`)
  d.info('Checking if OAuth2Proxy is running, waiting...')
  const { body: oauth2ProxyDeployment } = await k8s.readNamespacedDeployment('oauth2-proxy', 'istio-system')
  if (!oauth2ProxyDeployment) {
    throw new Error('OAuth2 Proxy deployment not found, waiting...')
  }
  const oauth2ProxyStatus = oauth2ProxyDeployment.status
  if (!oauth2ProxyStatus) {
    throw new Error('OAuth2 Proxy has no status, waiting...')
  }
  if (!oauth2ProxyStatus.availableReplicas || oauth2ProxyStatus.availableReplicas < 1) {
    throw new Error('OAuth2 Proxy has no available replicas, waiting...')
  }
  d.info('OAuth2proxy is running, continuing...')
}

export async function checkIfPipelineRunExists(): Promise<void> {
  const d = terminal(`cmd:${cmdName}:pipelineRun`)
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const customObjectsApi = kc.makeApiClient(CustomObjectsApi)

  const response = await customObjectsApi.listNamespacedCustomObject(
    'tekton.dev',
    'v1beta1',
    'otomi-pipelines',
    'pipelineruns',
  )

  const pipelineRuns = (response.body as { items: any[] }).items
  if (pipelineRuns.length === 0) {
    d.info(`No Tekton pipeline runs found, triggering a new one...`)
    await $`git commit --allow-empty -m "[apl-trigger]"`
    await $`git push`
    throw new Error('PipelineRun not found in otomi-pipelines namespace')
  }
  d.info(`There is a Tekton PipelineRuns continuing...`)
}

async function createRootCredentialsSecret(credentials: { adminUsername: string; adminPassword: string }) {
  const secretData = {
    username: credentials.adminUsername,
    password: credentials.adminPassword,
  }
  const kc = new KubeConfig()
  kc.loadFromDefault()
  const coreV1Api = kc.makeApiClient(CoreV1Api)
  await createGenericSecret(coreV1Api, 'root-credentials', 'default', secretData)
}

export const printWelcomeMessage = async (): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commit`)
  const values = (await hfValues()) as Record<string, any>
  const credentials = values.apps.keycloak
  await createRootCredentialsSecret({
    adminUsername: credentials.adminUsername,
    adminPassword: credentials.adminPassword,
  })
  const message = `
  ########################################################################################################################################
  #
  #  Visit the console at: https://console.${values.cluster.domainSuffix}
  #  Perform: kubectl get secret root-credentials -n default -o yaml
  #  To obtain access credentials in base64 encoded format
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
    await commit()
  },
}
