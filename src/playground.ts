#!/usr/bin/env node --nolazy -r ts-node/register

import { getDeploymentState, getHelmReleases } from './common/k8s'
import { writeValuesToFile } from './common/values'

async function play() {
  // const version = await getCurrentVersion()
  // const prevVersion: string = (await getDeploymentState()).version ?? version
  // console.log(version)

  const state = await getDeploymentState()
  const releases = await getHelmReleases()

  await writeValuesToFile(`/tmp/status.yaml`, { status: { otomi: state, helm: releases } }, true)
}

play()
