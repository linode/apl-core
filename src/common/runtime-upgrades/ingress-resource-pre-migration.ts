import retry from 'async-retry'
import { env } from '../envalid'
import { hf, HF_DEFAULT_SYNC_ARGS } from '../hf'
import { getArgoCdApp, k8s, setArgoCdAppSync } from '../k8s'
import { logLevelString, terminal } from '../debug'
import { loadYaml, rootDir } from '../utils'
import { RuntimeUpgradeContext } from './runtime-upgrades'
import { ApiException } from '@kubernetes/client-node'
import { removeApplication } from '../../cmd/apply-as-apps'

const PLATFORM_LB_SERVICE = 'ingress-nginx-platform-controller'
const PLATFORM_LB_NAMESPACE = 'ingress'
const PRESERVE_ANNOTATION_KEY = 'service.beta.kubernetes.io/linode-loadbalancer-preserve'
const NB_ID_ANNOTATION_KEY = 'service.beta.kubernetes.io/linode-loadbalancer-nodebalancer-id'

async function syncIngressNginx(context: RuntimeUpgradeContext) {
  const d = context.debug
  const args = [...HF_DEFAULT_SYNC_ARGS, '--state-values-set-string', 'apps.ingress-nginx-platform.enabled=true']
  await hf(
    {
      fileOpts: `${rootDir}/helmfile.d/helmfile-02.init.yaml.gotmpl`,
      labelOpts: ['class=platform'],
      logLevel: logLevelString(),
      args,
    },
    { streams: { stdout: d.stream.log, stderr: d.stream.error } },
  )
}

async function waitForLoadBalancerAnnotations(d: ReturnType<typeof terminal>): Promise<void> {
  await retry(
    async () => {
      let svc
      try {
        svc = await k8s.core().readNamespacedService({ name: PLATFORM_LB_SERVICE, namespace: PLATFORM_LB_NAMESPACE })
      } catch (error) {
        if (error instanceof ApiException && error.code === 404) {
          return
        } else {
          throw error
        }
      }
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

async function removeIngressService() {
  await retry(
    async () => {
      try {
        await k8s.core().deleteNamespacedService({ name: PLATFORM_LB_SERVICE, namespace: PLATFORM_LB_NAMESPACE })
      } catch (error) {
        if (error instanceof ApiException && error.code === 404) {
          return true
        } else {
          throw error
        }
      }
    },
    { retries: env.RETRIES, randomize: env.RANDOM, minTimeout: env.MIN_TIMEOUT, factor: env.FACTOR },
  )
}

export async function syncIngressNginxService(context: RuntimeUpgradeContext): Promise<void> {
  const d = context.debug
  const cluster = await loadYaml(`${env.ENV_DIR}/env/settings/cluster.yaml`, { noError: true })
  if (cluster?.spec?.provider !== 'linode') {
    d.info('Skipping ingress-nginx-platform sync: provider is not linode')
    return
  }
  const ingressApp = await getArgoCdApp('ingress-ingress-nginx-platform', k8s.custom())
  if (!ingressApp) {
    d.info('Skipping ingress-nginx-platform sync: ingress-nginx not enabled')
    return
  }
  d.info('Disabling ArgoCD auto-sync for ingress-nginx-platform')
  await setArgoCdAppSync('ingress-ingress-nginx-platform', false, k8s.custom())
  d.info('Syncing ingress-nginx-platform with updated values containing Linode NodeBalancer annotations')
  await syncIngressNginx(context)
  d.info('ingress-nginx-platform sync complete, waiting for LoadBalancer service annotations')
  await waitForLoadBalancerAnnotations(d)
  d.info('Removing LoadBalancer service')
  await removeIngressService()
}

export async function removeTektonDashboardApp(context: RuntimeUpgradeContext) {
  const d = context.debug
  d.info('Removing Tekton Dashboard application from tekton-pipelines namespace')
  await removeApplication('tekton-pipelines-tekton-dashboard')
}
