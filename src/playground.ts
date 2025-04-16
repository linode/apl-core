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
  // '/tmp/otomi-bootstrap-dev/**/teams/*/builds/*.yaml'

  const match = 'apps.app1.aaa'.match(/^apps\.([^.]+)\./)
  console.log(match)
  const globOptions = {
    nodir: true, // Exclude directories
    dot: false,
    ignore: ['**/.*/**'],
  }
  const files = await glob('/tmp/otomi-bootstrap-dev/env/teams/*/*settings{.yaml,.yaml.dec}', globOptions)
  console.log(files)
  // const spec = await load('/tmp/otomi-bootstrap-dev')
  // console.log(JSON.stringify(spec))
}

play()
