import retry from 'async-retry'
import { bootstrapGit, setIdentity } from 'src/common/bootstrap'
import { prepareEnvironment } from 'src/common/cli'
import { encrypt } from 'src/common/crypt'
import { terminal } from 'src/common/debug'
import { env } from 'src/common/envalid'
import { hfValues } from 'src/common/hf'
import { createUpdateConfigMap, createUpdateGenericSecret, k8s, waitTillGitRepoAvailable } from 'src/common/k8s'
import { getFilename } from 'src/common/utils'
import { getRepo } from 'src/common/values'
import { HelmArguments, setParsedArgs } from 'src/common/yargs'
import { Argv } from 'yargs'
import { $, cd } from 'zx'
import { validateValues } from './validate-values'

const cmdName = getFilename(__filename)

export const rootDir = process.cwd() === '/home/app/stack/env' ? '/home/app/stack' : process.cwd()

interface Arguments extends HelmArguments {
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

const commitAndPush = async (values: Record<string, any>, branch: string, initialInstall = false): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:commitAndPush`)
  d.info('Committing values')
  const message = initialInstall ? 'otomi commit' : 'updated values [ci skip]'
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

    // The below 'git status' command will always return at least single new line
    const filesChangedCount = (await $`git status --untracked-files=no --porcelain`).toString().split('\n').length - 1
    if (filesChangedCount === 0) {
      d.log('Nothing to commit')
      return
    }
    await $`git commit -m ${message} --no-verify`.quiet()
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
  await commitAndPush(values, branch, initialInstall)
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

export const createWelcomeConfigMap = async (secretName: string, domainSuffix: string): Promise<void> => {
  const welcomeMessage = `Welcome to App Platform!

Your installation has completed successfully.

CONSOLE ACCESS:
  The App Platform console is available at: https://console.${domainSuffix}

LOGIN CREDENTIALS:
  To obtain your login credentials, run the following commands:

  Username: kubectl get secret ${secretName} -n keycloak -o jsonpath='{.data.username}' | base64 -d
  Password: kubectl get secret ${secretName} -n keycloak -o jsonpath='{.data.password}' | base64 -d

NEXT STEPS:
  1. Visit the console URL above
  2. Log in using the credentials obtained from the commands above
  3. Explore the platform features and start deploying your applications

For documentation and support, visit: https://techdocs.akamai.com/app-platform/docs/welcome
`

  await createUpdateConfigMap(k8s.core(), 'welcome', 'apl-operator', {
    message: welcomeMessage,
    consoleUrl: `https://console.${domainSuffix}`,
    secretName,
    secretNamespace: 'keycloak',
  })
}

export const module = {
  command: cmdName,
  describe: 'Wrapper that validates values, and then commits and pushes changed files',
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
