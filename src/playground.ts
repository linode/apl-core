#!/usr/bin/env node --nolazy --import tsx

import { terminal } from './common/debug'
import { RuntimeUpgradeContext } from './common/runtime-upgrades/runtime-upgrades'
import { detachApplicationFromApplicationSet, pruneArgoCDImageUpdater } from './common/runtime-upgrades/v4.13.0'

async function play() {
  // const version = await getPackageVersion()
  // const prevVersion: string = (await getDeploymentState()).version ?? version
  // console.log(version)
  // const state = await getDeploymentState()
  // const releases = await getHelmReleases()
  // const data = await hfValues(
  //   { withWorkloadValues: true },
  //   '/Users/jehoszafatzimnowoda/workspace/linode/apl-core/tests/fixtures',
  // )
  // await writeValuesToFile(`/tmp/status.yaml`, { status: { otomi: state, helm: releases } }, true)
  // '/tmp/otomi-bootstrap-dev/**/teams/*/builds/*.yaml'
  const d = terminal('cmd:upgrade:runtimeUpgrade')
  const context: RuntimeUpgradeContext = {
    debug: d,
  }
  try {
    await detachApplicationFromApplicationSet(context)
    await pruneArgoCDImageUpdater(context)
  } catch (error) {
    d.error('Error during playground execution', error)
  }

  // const spec = await load('/tmp/otomi-bootstrap-dev')
  // console.log(JSON.stringify(spec))
}

play()
