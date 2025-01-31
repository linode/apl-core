#!/usr/bin/env node --nolazy -r ts-node/register

import { glob } from 'glob'

async function play() {
  // const version = await getCurrentVersion()
  // const prevVersion: string = (await getDeploymentState()).version ?? version
  // console.log(version)

  // const state = await getDeploymentState()
  // const releases = await getHelmReleases()
  // const data = await hfValues(
  //   { withWorkloadValues: true },
  //   '/Users/jehoszafatzimnowoda/workspace/linode/apl-core/tests/fixtures',
  // )
  // await writeValuesToFile(`/tmp/status.yaml`, { status: { otomi: state, helm: releases } }, true)

  const files = await glob('/tmp/otomi-bootstrap-dev/env/**/*.{yaml,yaml.dec}', { ignore: 'node_modules/**' })
  console.log(files)
}

play()
