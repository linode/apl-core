import retry from 'async-retry'
import { env } from '../envalid'
import { hf, HF_DEFAULT_SYNC_ARGS } from '../hf'
import { k8s } from '../k8s'
import { logLevelString, terminal } from '../debug'
import { rootDir } from '../utils'
import { RuntimeUpgradeContext } from './runtime-upgrades'

const PLATFORM_LB_SERVICE = 'ingress-nginx-platform-controller'
const PLATFORM_LB_NAMESPACE = 'ingress'
const PRESERVE_ANNOTATION_KEY = 'service.beta.kubernetes.io/linode-loadbalancer-preserve'
const NB_ID_ANNOTATION_KEY = 'service.beta.kubernetes.io/linode-loadbalancer-nodebalancer-id'

export async function syncIngressNginxPlatform(context: RuntimeUpgradeContext): Promise<void> {
  const d = context.debug
  d.info('Syncing ingress-nginx-platform with updated values containing Linode NodeBalancer annotations')
  await hf(
    {
      fileOpts: `${rootDir}/helmfile.d/helmfile-02.init.yaml.gotmpl`,
      labelOpts: ['class=platform'],
      logLevel: logLevelString(),
      args: HF_DEFAULT_SYNC_ARGS,
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )
  d.info('ingress-nginx-platform sync complete, waiting for LoadBalancer service annotations')
  await waitForLoadBalancerAnnotations(d)
}

async function waitForLoadBalancerAnnotations(d: ReturnType<typeof terminal>): Promise<void> {
  await retry(
    async () => {
      const svc = await k8s
        .core()
        .readNamespacedService({ name: PLATFORM_LB_SERVICE, namespace: PLATFORM_LB_NAMESPACE })
      const annotations = svc?.metadata?.annotations ?? {}
      const hasPreserve = annotations[PRESERVE_ANNOTATION_KEY] !== undefined
      const hasNbId = annotations[NB_ID_ANNOTATION_KEY] !== undefined
      if (!hasPreserve || !hasNbId) {
        throw new Error(
          `LoadBalancer service '${PLATFORM_LB_SERVICE}' is missing Linode NodeBalancer annotations (preserve=${hasPreserve}, nbId=${hasNbId})`,
        )
      }
      d.info(
        `LoadBalancer service '${PLATFORM_LB_SERVICE}' has the required Linode NodeBalancer annotations (NB ID: ${annotations[NB_ID_ANNOTATION_KEY]})`,
      )
    },
    { retries: env.RETRIES, randomize: env.RANDOM, minTimeout: env.MIN_TIMEOUT, factor: env.FACTOR },
  )
}
