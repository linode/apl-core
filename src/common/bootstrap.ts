import { copyFileSync, existsSync } from 'fs-extra'
import { isIPv6 } from 'net'
import { $, cd, nothrow } from 'zx'
import { decrypt } from './crypt'
import { terminal } from './debug'
import { env, isChart, isCli } from './envalid'
import { hfValues } from './hf'
import { getOtomiLoadBalancerIP } from './k8s'
import { getFilename, loadYaml, rootDir } from './utils'
import { getRepo, writeValues } from './values'
import { getParsedArgs } from './yargs'

const cmdName = getFilename(__filename)

export const prepareDomainSuffix = async (inValues: Record<string, any> | undefined = undefined): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:setDomainSuffix`)
  const values = inValues ?? (await hfValues())
  if (values && !values.cluster.domainSuffix) {
    d.info('cluster.domainSuffix was not found, creating $loadbalancerIp.nip.io as fallback')
    const ingressIP = values.apps['ingress-nginx']?.loadBalancerIP ?? (await getOtomiLoadBalancerIP())
    // When ingressIP is V6, we need to use sslip.io as they resolve it, otherwise use nip.io as it uses PowerDNS
    const domainSuffix = isIPv6(ingressIP) ? `${ingressIP.replaceAll(':', '-')}.sslip.io` : `${ingressIP}.nip.io`
    await writeValues({
      cluster: {
        domainSuffix,
      },
    })
  } else {
    d.info('cluster.domainSuffix is already set')
  }
}

/**
 * Prepare the ENV_DIR before anything else. Scenario's:
 * - It might be a fresh empty folder that needs init and files added
 * - It might have a remote with commits: clone it first and add files back in that don't exist yet
 */
export const bootstrapGit = async (inValues?: Record<string, any>): Promise<void> => {
  const d = terminal(`cmd:${cmdName}:bootstrapGit`)
  if (existsSync(`${env.ENV_DIR}/.git`)) {
    d.info(`Git repo was already bootstrapped`)
    return
  }
  let values = inValues
  if (!values) {
    if (isCli) values = (await hfValues({ filesOnly: true })) as Record<string, any>
    else if (isChart) values = loadYaml(env.VALUES_INPUT) as Record<string, any>
    else return
  }
  const argv = getParsedArgs()
  if (!values?.cluster?.domainSuffix && !argv.destroy) return // too early, commit will handle it
  if (!values?.cluster?.domainSuffix && argv.destroy) {
    // we couldn't find the domainSuffix in the values, so create it
    await prepareDomainSuffix(values)
  }
  const { remote, branch, email, username, password } = getRepo(values)
  cd(env.ENV_DIR)
  // we don't care about ssl verification as repo endpoint is either ours or user input
  process.env.GIT_SSL_NO_VERIFY = '1'
  let hasCommits = false
  try {
    d.debug('Checking out remote into /tmp/xx to test if repo exists and use if needed')
    // check remote exists by cloning with a 10 second timeout (if remote is unreachable it takes 30 secs to timeout)
    await $`set +e && rm -rf /tmp/xx >/dev/null && set -e && timeout 10 git clone ${remote} /tmp/xx`
    // it didn't throw, so we know we have an existing remote
    // do we have commits remotely?
    try {
      await $`cd /tmp/xx && git fetch && git checkout ${branch} && git log && cd -`
      d.info('We have found a clone with commits, so we use that and rsync new files onto it')
      hasCommits = true
    } catch (e) {
      // for some reason we were able to clone, but not checkout any commits
      // (could be empty clone)
      cd(env.ENV_DIR) // to be nice
      throw e // will be caught below and init will continue
    }
    // we know we have commits, so we replace ENV_DIR with the clone files and overwrite with new values
    // so first get the new values without secrets (as those exist already)
    const newValues = (await hfValues({ filesOnly: true })) as Record<string, any>
    cd(env.ENV_DIR)
    // then sync the clone back to ENV_DIR
    const flags = '-rl' // recursive, preserve symlinks and groups (all we can do without superuser privs)
    await $`rsync ${flags} ${env.ENV_DIR}/ /tmp/xx/ && rm -rf .[!.]* * && rsync ${flags} --exclude="." /tmp/xx/ ${env.ENV_DIR}/`
    // decrypt the freshly cloned repo
    await decrypt()
    // finally write back the new values without overwriting existing values
    await writeValues(newValues)
  } catch (e) {
    d.debug(e)
    d.info('Remote does not exist yet. Expecting first commit to come later.')
  }
  cd(env.ENV_DIR)
  if (!existsSync(`${env.ENV_DIR}/.git`)) {
    d.info('Initializing values git repo.')
    await $`git init .`
  }
  if (isCli) copyFileSync(`${rootDir}/bin/hooks/pre-commit`, `${env.ENV_DIR}/.git/hooks/pre-commit`)
  else await nothrow($`git config --global --add safe.directory ${env.ENV_DIR}`)
  await nothrow($`git config --local user.name ${username}`)
  await nothrow($`git config --local user.password ${password}`)
  await nothrow($`git config --local user.email ${email}`)
  if (!hasCommits) {
    await nothrow($`git checkout -b ${branch}`)
    await nothrow($`git remote add origin ${remote}`)
  }
  if (existsSync(`${env.ENV_DIR}/.sops.yaml`)) await nothrow($`git config --local diff.sopsdiffer.textconv "sops -d"`)
  d.log(`Done bootstrapping git`)
}
