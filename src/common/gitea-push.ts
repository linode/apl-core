import { $, cd } from 'zx'
import { terminal } from './debug'
import { env } from './envalid'
import { hfValues } from './hf'
import { currDir, waitTillAvailable } from './utils'

export const giteaPush = async (): Promise<boolean> => {
  const debug = terminal('Gitea Push')
  debug.info('Gitea push')
  const hfVals = await hfValues()
  const stage = hfVals.charts?.['cert-manager']?.stage === 'staging' ? ' -c http.sslVerify=false' : ' '
  const clusterDomain = hfVals.cluster?.domainSuffix
  const giteaUrl = `gitea.${clusterDomain}`

  await waitTillAvailable(giteaUrl)

  const currDirVal = await currDir()

  cd(env.ENV_DIR)
  try {
    await $`git${stage} push -u origin main -f`
    debug.log('Otomi-values has been pushed to gitea')
    return true
  } catch (error) {
    debug.error(error)
    return false
  } finally {
    cd(currDirVal)
  }
}

export default giteaPush
