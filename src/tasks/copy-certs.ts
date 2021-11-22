import { V1Secret, V1SecretList } from '@kubernetes/client-node'
import { IncomingMessage } from 'http'
import { cleanEnvironment, taskEnvSpec } from '../common/envalid'
import k8s from '../common/k8s'
import { getFilename, OtomiDebugger, terminal } from '../common/utils'

const { getApiClient } = k8s

// select what we want from env
const { OTOMI_FLAGS, TEAM_IDS } = taskEnvSpec
// get a function that validates input requirements and does transformation on the selected env vars
const parseEnv = cleanEnvironment({ OTOMI_FLAGS, TEAM_IDS }, true) as CallableFunction

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

let targetNamespace = 'istio-system'

const processed: string[] = []

export const targetTlsSecretsFilter = ({ metadata }: V1Secret) =>
  metadata!.name!.indexOf(`copy-`) === 0 && metadata!.annotations!['app.kubernetes.io/managed-by'] === 'otomi'

// Returns list of names of all TLS secrets in the target namespace that were created before.
export const getTargetTlsSecretNames = async (): Promise<string[]> => {
  const targetTlsSecretsRes = await getApiClient().listNamespacedSecret(
    targetNamespace,
    undefined,
    undefined,
    undefined,
    'type=kubernetes.io/tls',
  )
  const { body: tlsSecrets }: { body: V1SecretList } = targetTlsSecretsRes
  const targetTlsSecretNames = tlsSecrets.items.filter(targetTlsSecretsFilter).map((s: V1Secret) => s.metadata!.name!)
  debug.debug(`Found the following TLS secrets in the namespace "${targetNamespace}": ${targetTlsSecretNames}`)
  return targetTlsSecretNames
}

export const createTargetTlsSecret = (name, teamId, data): Promise<{ response: IncomingMessage; body: V1Secret }> => {
  debug.info(`Creating TLS secret "${targetNamespace}/${name}"`)
  const newSecret: V1Secret = {
    ...new V1Secret(),
    metadata: {
      namespace: targetNamespace,
      name,
      annotations: {
        'app.kubernetes.io/managed-by': 'otomi',
        'log.otomi.io/copied-from-namespace': teamId,
      },
    },
    type: 'kubernetes.io/tls',
    data,
  }
  return getApiClient().createNamespacedSecret(targetNamespace, newSecret)
}

export const copyTeamTlsSecrets = async (teamId, targetTlsSecretNames): Promise<void> => {
  debug.info(`Copying TLS secrets from team-${teamId} to ${targetNamespace} namespace`)
  const namespace = `team-${teamId}`
  const getTargetSecretName = (name) => `copy-${teamId}-${name}`
  // get all target namespace TLS secrets
  const {
    body: { items: teamTlsSecrets },
  } = await getApiClient().listNamespacedSecret(namespace, undefined, undefined, undefined, 'type=kubernetes.io/tls')
  // create new ones if not existing
  await Promise.all(
    teamTlsSecrets
      .filter(({ metadata }) => !targetTlsSecretNames.includes(getTargetSecretName(metadata!.name)))
      .map(({ metadata, data }) => {
        const name = getTargetSecretName(metadata!.name)
        return createTargetTlsSecret(name, teamId, data)
      }),
  )
  debug.info(`Finished copying TLS secrets from team-${teamId}`)
  // update processed list for pruning later
  teamTlsSecrets.map(({ metadata }) => processed.push(getTargetSecretName(metadata!.name as string)))
}

export const pruneTlsSecrets = async (targetTlsSecretNames): Promise<void> => {
  const prunableTargetSecrets = targetTlsSecretNames.filter((name) => !processed.includes(name))
  await Promise.all(
    prunableTargetSecrets.map((name) => {
      debug.info(`Pruning TLS secret "${targetNamespace}/${name}"`)
      return getApiClient().deleteNamespacedSecret(name, targetNamespace)
    }),
  )
}

export default async (): Promise<void> => {
  const env = parseEnv()
  if (env.OTOMI_FLAGS.hasCloudLB) targetNamespace = 'ingress'
  try {
    const targetTlsSecretNames = await getTargetTlsSecretNames()
    await Promise.all(
      env.TEAM_IDS.map((teamId) => {
        return copyTeamTlsSecrets(teamId, targetTlsSecretNames)
      }),
    )
    await pruneTlsSecrets(targetTlsSecretNames)
  } catch (e) {
    throw new Error(`One or more errors occurred copying TLS secrets: ${JSON.stringify(e)}`)
  }
}
