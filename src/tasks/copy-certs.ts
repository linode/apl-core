import { V1Secret, V1SecretList } from '@kubernetes/client-node'
import { env } from '../common/envalid'
import { getApiClient } from '../common/k8s'
import { getFilename, OtomiDebugger, terminal } from '../common/utils'

const cmdName = getFilename(__filename)
const debug: OtomiDebugger = terminal(cmdName)

let targetNamespace = 'istio-system'
const client = getApiClient()

const getIstioTlsSecretNames = async (): Promise<string[]> => {
  const istioTlsSecretsRes = await client.listNamespacedSecret(
    'istio-system',
    undefined,
    undefined,
    undefined,
    'type=kubernetes.io/tls',
  )
  const { body: istioTlsSecrets }: { body: V1SecretList } = istioTlsSecretsRes

  const istioTlsSecretNames = istioTlsSecrets.items.map((s: V1Secret) => s.metadata!.name!)
  debug.debug(`Found the following TLS secrets in the ${targetNamespace}: ${istioTlsSecretNames}`)
  return istioTlsSecretNames
}

const copyTeamTlsSecrets = async (teamId, istioTlsSecretNames): Promise<void> => {
  debug.info(`Copying TLS secrets from team-${teamId} to istio-system namespace`)
  const namespace = `team-${teamId}`
  const getIstioSecretName = (metadata) => `copy-${teamId}-${metadata.name}`
  const teamTlsSecretsRes = await client.listNamespacedSecret(
    namespace,
    undefined,
    undefined,
    undefined,
    'type=kubernetes.io/tls',
  )
  const {
    body: { items: teamTlsSecrets },
  } = teamTlsSecretsRes
  try {
    await Promise.all(
      teamTlsSecrets
        .filter(({ metadata }) => !istioTlsSecretNames.includes(getIstioSecretName(metadata)))
        .map(({ metadata, data }) => {
          const name = getIstioSecretName(metadata)
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
          return client.createNamespacedSecret(targetNamespace, newSecret)
        }),
    )
    debug.info(`Finished copying TLS secrets from team-${teamId}`)
  } catch (e) {
    throw new Error(`One or more errors occurred copying secrets: ${JSON.stringify(e)}`)
  }
}

export default async (values: Record<string, any>): Promise<void> => {
  if (values.otomi.hasCloudLB) targetNamespace = 'ingress'
  const istioTlsSecretNames = await getIstioTlsSecretNames()
  await Promise.all(
    env.TEAM_IDS.map((teamId) => {
      return copyTeamTlsSecrets(teamId, istioTlsSecretNames)
    }),
  )
}
