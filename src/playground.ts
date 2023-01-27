#!/usr/bin/env node --nolazy -r ts-node/register

import { getDeploymentState } from './common/k8s'
import { getCurrentVersion } from './common/values'

async function play() {
  const version = await getCurrentVersion()
  const prevVersion: string = (await getDeploymentState()).version ?? version
  console.log(version)
}

play()
