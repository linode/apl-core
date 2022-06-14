#!/usr/bin/env node --nolazy -r ts-node/register
/* eslint-disable @typescript-eslint/no-floating-promises */
import { $ } from 'zx'

const main = async function (): Promise<void> {
  $.verbose = false
  const apiResourcesRaw: string = (await $`kubectl api-resources | grep ' true '`).stdout
  const lines = apiResourcesRaw.split('\n')
  const trimmedLines = lines
    .filter((n) => n)
    .map((line) => {
      const cols = line.replace(/\s+/g, ' ').trim().split(' ')
      if (cols.length === 5) return `${cols[2]}/${cols[4]}`
      return `${cols[1]}/${cols[3]}`
    })
  console.log(trimmedLines.join('\n'))
}

main()
