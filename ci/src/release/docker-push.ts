import { execSync } from 'child_process'
import { isHighestStableTag } from './version'

async function main() {
  const tag = process.env.RELEASE_TAG!
  const cacheImage = process.env.CACHE_IMAGE!
  const dockerRepo = process.env.DOCKER_REPO ?? 'linode/apl-core'
  const cacheRegistry = process.env.CACHE_REGISTRY ?? 'ghcr.io/linode/apl-core'
  const dryRun = process.env.DRY_RUN === 'true'
  const isRc = tag.includes('-rc.')

  const allTags = execSync('git tag --sort=-v:refname', { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean)

  const shouldPushLatest = !isRc && isHighestStableTag(tag, allTags)

  console.log(`Pushing Docker image for ${tag}`)
  console.log(`  cache image: ${cacheImage}`)
  console.log(`  push :latest: ${shouldPushLatest}`)

  function run(cmd: string) {
    if (dryRun) { console.log(`[dry-run] ${cmd}`); return }
    execSync(cmd, { stdio: 'inherit' })
  }

  run(`docker pull "${cacheImage}"`)
  run(`docker tag "${cacheImage}" "${dockerRepo}:${tag}"`)
  run(`docker push "${dockerRepo}:${tag}"`)
  run(`docker tag "${cacheImage}" "${cacheRegistry}:${tag}"`)
  run(`docker push "${cacheRegistry}:${tag}"`)

  if (shouldPushLatest) {
    run(`docker tag "${cacheImage}" "${dockerRepo}:latest"`)
    run(`docker push "${dockerRepo}:latest"`)
  }
}

main().catch((err) => { console.error(err.message); process.exit(1) })
