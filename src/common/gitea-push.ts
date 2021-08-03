import { existsSync } from 'fs'
import { $, cd, nothrow } from 'zx'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import { currDir, waitTillAvailable } from './utils'

export const giteaPush = async (): Promise<void> => {
  const debug = terminal('Gitea Push')
  debug.info('Gitea push')
  const hfVals = await hfValues()
  if (!hfVals.charts?.gitea?.enabled) {
    debug.info('Gitea is disabled')
    return
  }
  const stage = hfVals.charts?.['cert-manager']?.stage === 'staging' ? ' -c http.sslVerify=false' : ' '
  debug.log(hfVals.cluster)
  const clusterDomain = hfVals.cluster?.domainSuffix
  if (!clusterDomain) {
    debug.error('cluster.domainSuffix is not set')
    process.exit(1)
  }
  const giteaUrl = `gitea.${clusterDomain}`

  await waitTillAvailable(giteaUrl)

  const giteaPassword = hfVals.charts?.gitea?.adminPassword ?? hfVals.otomi?.adminPassword
  const giteaUser = 'otomi-admin'
  const giteaOrg = 'otomi'
  const giteaRepo = 'values'

  const currDirVal = await currDir()

  cd(env.ENV_DIR)
  try {
    if (!existsSync('.git')) {
      await $`git init`
      await $`git checkout -b main`
    }
    const remoteOrigin = 'origin'

    const remoteOriginUrl = (await nothrow($`git config remote.${remoteOrigin}.url`)).stdout.trim()
    if (!remoteOriginUrl.length) {
      await $`git remote add ${remoteOrigin} "https://${giteaUser}:${giteaPassword}@${giteaUrl}/${giteaOrg}/${giteaRepo}.git"`
      debug.log('Added gitea as a remote origin')
      debug.log(`You can push using: \`git push main ${remoteOrigin}\``)
    }
    await $`git config user.name "Otomi Admin"`
    await $`git config user.email "otomi-admin@${clusterDomain}"`
    try {
      // const fetchResult = await nothrow($`git${stage} fetch ${remoteOrigin} main >/dev/null`)
      // if (fetchResult.exitCode === 0) debug.error('There is already data in gitea.')
      // else {
      await $`git add -A`
      await $`git commit --no-verify -m "Automated commit of otomi-values"`
      await $`git${stage} push -u ${remoteOrigin} main -f`
      debug.log('Otomi-values has been pushed to gitea')
      // }
    } catch (error) {
      debug.error(error.message)
    }
  } catch (error) {
    debug.error(error)
  } finally {
    cd(currDirVal)
  }
}

export default giteaPush
