#!/usr/bin/env node --nolazy --import tsx

import { createUpdateConfigMap, k8s } from './common/k8s'
import { PatchStrategy, setHeaderOptions } from '@kubernetes/client-node'

async function play() {
  const body = {
    key1: 'value100',
    key2: 'value200',
  }
  await createUpdateConfigMap(k8s.core(), 'create-update', 'default', body)

  const bodyPatch = {
    apiVersion: 'v1',
    kind: 'ConfigMap',
    metadata: {
      name: 'patch',
      namespace: 'default',
    },
    data: {
      key1: 'value100',
      key2: 'value200',
    },
  }
  await k8s.core().patchNamespacedConfigMap(
    {
      name: 'patch',
      namespace: 'default',
      body: bodyPatch,
      fieldManager: 'apl-operator',
      force: true,
    },
    setHeaderOptions('Content-Type', PatchStrategy.ServerSideApply),
  )
}

play()
