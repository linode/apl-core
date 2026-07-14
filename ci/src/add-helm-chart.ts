import type { ExecSyncOptions } from 'node:child_process'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import semver from 'semver'

type Opts = {
  name: string
  repository: string
  public: boolean
  configurePublicSecurity: boolean
  runCompare: boolean
}

export type CommandRunner = (command: string, options?: ExecSyncOptions) => string

export type RuntimeDeps = {
  runCommand: CommandRunner
  pid: number
  log: (message: string) => void
}

const defaultRunCommand: CommandRunner = (command, options = {}) => {
  const result = execSync(command, options)
  if (result === null) return ''
  return typeof result === 'string' ? result : result.toString('utf8')
}

const defaultDeps: RuntimeDeps = {
  runCommand: defaultRunCommand,
  pid: process.pid,
  log: (message) => console.log(message),
}

function usage(): never {
  console.error(
    'Usage: npx tsx ci/src/add-helm-chart.ts <name> <repository> [--public true|false] [--configure-public-security true|false] [--run-compare true|false]',
  )
  process.exit(2)
}

function parseBool(value: string, flag: string): boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`Invalid value for ${flag}: ${value}. Expected true|false.`)
}

async function parseArgs(argv: string[]): Promise<Opts> {
  if (argv.length < 2) usage()

  const name = argv[0]
  const repository = argv[1]

  let isPublic: boolean | undefined
  let configurePublicSecurity: boolean | undefined
  let runCompare = true

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--public') {
      const value = argv[i + 1]
      if (!value) usage()
      isPublic = parseBool(value, '--public')
      i += 1
      continue
    }
    if (arg === '--configure-public-security') {
      const value = argv[i + 1]
      if (!value) usage()
      configurePublicSecurity = parseBool(value, '--configure-public-security')
      i += 1
      continue
    }
    if (arg === '--run-compare') {
      const value = argv[i + 1]
      if (!value) usage()
      runCompare = parseBool(value, '--run-compare')
      i += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  if (isPublic === undefined && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const ans = await rl.question('Expose app publicly? (true/false) [false]: ')
    rl.close()
    isPublic = ans.trim() === '' ? false : parseBool(ans.trim(), '--public')
  }
  if (isPublic === undefined) isPublic = false

  if (configurePublicSecurity === undefined) {
    if (isPublic && process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      const ans = await rl.question('Scaffold HTTPRoute + Istio authn/authz resources? (true/false) [true]: ')
      rl.close()
      configurePublicSecurity = ans.trim() === '' ? true : parseBool(ans.trim(), '--configure-public-security')
    } else {
      configurePublicSecurity = false
    }
  }

  return {
    name,
    repository,
    public: isPublic,
    configurePublicSecurity,
    runCompare,
  }
}

export function parseStableSemver(version: string): semver.SemVer | null {
  const cleaned = semver.valid(version) ?? semver.valid(version.replace(/^v/, ''))
  if (!cleaned) return null
  const parsed = semver.parse(cleaned)
  if (!parsed) return null
  if (parsed.prerelease.length > 0) return null
  return parsed
}

export function resolveLatestOfficialSemver(name: string, repository: string, deps: RuntimeDeps = defaultDeps): string {
  if (repository.startsWith('oci://')) {
    const out = deps.runCommand(`helm show chart ${repository}/${name}`, { encoding: 'utf8' })
    const m = out.match(/^version:\s*(.+)$/m)
    if (!m) {
      throw new Error(`Could not resolve chart version from OCI source for ${name}`)
    }
    const version = m[1].trim()
    const parsed = parseStableSemver(version)
    if (!parsed) {
      throw new Error(`Latest OCI chart version is not a stable semver: ${version}`)
    }
    return version
  }

  const tempAlias = `apl-temp-${name}-${deps.pid}`
  deps.runCommand(`helm repo add ${tempAlias} ${repository}`, { stdio: 'inherit' })
  let out = ''
  try {
    out = deps.runCommand(`helm search repo ${tempAlias}/${name} --versions -o json`, { encoding: 'utf8' })
  } finally {
    deps.runCommand(`helm repo remove ${tempAlias}`, { stdio: 'inherit' })
  }
  const items = JSON.parse(out) as Array<{ name?: string; version?: string }>
  const candidates = items
    .filter((i) => i.name?.endsWith(`/${name}`) || i.name === name)
    .map((i) => ({ raw: i.version ?? '', parsed: parseStableSemver(i.version ?? '') }))
    .filter((i) => i.parsed !== null) as Array<{ raw: string; parsed: semver.SemVer }>

  if (candidates.length === 0) {
    throw new Error(`No stable semver chart versions found for ${name} in ${repository}`)
  }

  candidates.sort((a, b) => semver.rcompare(a.parsed.version, b.parsed.version))
  return candidates[0].raw
}

function requireFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`)
  }
}

function readLines(filePath: string): string[] {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
}

function writeLines(filePath: string, lines: string[]): void {
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')
}

function findHighestHelmfileNumber(helmfileDir: string): number {
  const names = fs.readdirSync(helmfileDir)
  let max = 0
  for (const name of names) {
    const m = name.match(/^helmfile-(\d+)\..*\.yaml\.gotmpl$/)
    if (!m) continue
    const n = Number(m[1])
    if (n > max) max = n
  }
  return max
}

function hasReleaseNameInHelmfiles(helmfileDir: string, releaseName: string): boolean {
  const files = fs.readdirSync(helmfileDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.gotmpl'))
  const rx = new RegExp(`^\\s*-\\s+name:\\s+${releaseName}\\s*$`, 'm')
  for (const file of files) {
    const content = fs.readFileSync(path.join(helmfileDir, file), 'utf8')
    if (rx.test(content)) return true
  }
  return false
}

function insertSortedBlock(
  lines: string[],
  startMatcher: (line: string) => boolean,
  itemMatcher: (line: string) => RegExpMatchArray | null,
  sectionEndMatcher: (line: string) => boolean,
  getKey: (m: RegExpMatchArray) => string,
  newKey: string,
  emitBlock: () => string[],
): string[] {
  const out: string[] = []
  let inSection = false
  let inserted = false

  for (const line of lines) {
    if (!inSection && startMatcher(line)) {
      out.push(line)
      inSection = true
      continue
    }

    if (inSection && !inserted) {
      const item = itemMatcher(line)
      if (item) {
        const key = getKey(item)
        if (key > newKey) {
          out.push(...emitBlock())
          inserted = true
        }
      } else if (sectionEndMatcher(line)) {
        out.push(...emitBlock())
        inserted = true
        inSection = false
      }
    }

    out.push(line)
  }

  if (inSection && !inserted) {
    out.push(...emitBlock())
    inserted = true
  }

  if (!inserted) {
    throw new Error('Failed to insert block in target section')
  }

  return out
}

function ensureChartDependency(chartIndexPath: string, name: string, version: string, repository: string): void {
  const content = fs.readFileSync(chartIndexPath, 'utf8')
  if (content.includes(`- name: ${name}\n`)) {
    console.log(`Chart index already contains dependency for ${name}`)
    return
  }

  const lines = readLines(chartIndexPath)
  const next = insertSortedBlock(
    lines,
    (line) => line.trim() === 'dependencies:',
    (line) => line.match(/^  - name: (.+)$/),
    () => false,
    (m) => m[1],
    name,
    () => [`  - name: ${name}`, `    version: ${version}`, `    repository: ${repository}`],
  )

  writeLines(chartIndexPath, next)
  console.log('Added dependency to chart/chart-index/Chart.yaml')
}

function vendorChart(root: string, name: string, version: string, repository: string, deps: RuntimeDeps = defaultDeps): void {
  const chartDir = path.join(root, 'charts', name)
  if (fs.existsSync(chartDir)) {
    console.log(`charts/${name} already exists; skipping chart pull`)
    return
  }

  if (repository.startsWith('oci://')) {
    deps.runCommand(`helm pull ${repository}/${name} --version ${version} --untar --untardir ${path.join(root, 'charts')}`, {
      stdio: 'inherit',
    })
  } else {
    deps.runCommand(`helm pull ${name} --repo ${repository} --version ${version} --untar --untardir ${path.join(root, 'charts')}`, {
      stdio: 'inherit',
    })
  }
  console.log(`Vendored chart into charts/${name}`)
}

function createHelmfile(root: string, name: string, isPublic: boolean, configurePublicSecurity: boolean): string {
  const next = findHighestHelmfileNumber(path.join(root, 'helmfile.d')) + 1
  const padded = String(next).padStart(2, '0')
  const relPath = `helmfile.d/helmfile-${padded}.${name}.yaml.gotmpl`
  const fullPath = path.join(root, relPath)

  const parts: string[] = [
    'bases:',
    '  - snippets/defaults.yaml',
    '---',
    'bases:',
    '  - snippets/env.gotmpl',
    '---',
    'bases:',
    '  - snippets/derived.gotmpl',
    '---',
    '{{ readFile "snippets/templates.gotmpl" }}',
    '{{- $v := .Values }}',
    '{{- $a := $v.apps }}',
    '',
    'releases:',
  ]

  if (isPublic && configurePublicSecurity) {
    parts.push(
      `  - name: ${name}-artifacts`,
      `    installed: {{ $a | get "${name}.enabled" }}`,
      `    namespace: ${name}`,
      '    labels:',
      `      pkg: ${name}`,
      '      app: core',
      '    <<: *raw',
    )
  }

  parts.push(
    `  - name: ${name}`,
    `    installed: {{ $a | get "${name}.enabled" }}`,
    `    namespace: ${name}`,
    '    labels:',
    `      pkg: ${name}`,
    '      app: core',
    '    <<: *default',
    '',
  )

  fs.writeFileSync(fullPath, parts.join('\n'), 'utf8')
  console.log(`Created new Helmfile release file: ${relPath}`)
  return relPath
}

function ensureCoreNamespace(corePath: string, name: string, isPublic: boolean): void {
  const lines = readLines(corePath)
  if (lines.some((line) => line === `    - name: ${name}`)) {
    console.log(`core.yaml already contains namespace ${name}`)
    return
  }

  const next = insertSortedBlock(
    lines,
    (line) => line.trim() === 'namespaces:',
    (line) => line.match(/^    - name: (.+)$/),
    (line) => line === 'adminApps:',
    (m) => m[1],
    name,
    () => {
      const block = [`    - name: ${name}`, `      app: ${name}`]
      if (!isPublic) block.push('      disableIstioInjection: true')
      return block
    },
  )

  writeLines(corePath, next)
  console.log(`Added namespace ${name} to core.yaml`)
}

function ensureAdminApp(corePath: string, name: string): void {
  const lines = readLines(corePath)

  let inAdmin = false
  for (const line of lines) {
    if (line === 'adminApps:') {
      inAdmin = true
      continue
    }
    if (line === 'teamApps:') {
      inAdmin = false
    }
    if (inAdmin && line === `  - name: ${name}`) {
      console.log(`core.yaml already contains adminApps entry for ${name}`)
      return
    }
  }

  const next = insertSortedBlock(
    lines,
    (line) => line === 'adminApps:',
    (line) => line.match(/^  - name: (.+)$/),
    (line) => line === 'teamApps:',
    (m) => m[1],
    name,
    () => [`  - name: ${name}`, '    tags: [custom]', '    ownHost: true'],
  )

  writeLines(corePath, next)
  console.log(`Added adminApps public entry for ${name} in core.yaml`)
}

function ensureDefaultsEntry(defaultsPath: string, name: string): void {
  const lines = readLines(defaultsPath)
  if (lines.some((line) => line === `          ${name}:`)) {
    console.log(`defaults already contains apps.${name}`)
    return
  }

  const next = insertSortedBlock(
    lines,
    (line) => line === '        apps:',
    (line) => line.match(/^          ([A-Za-z0-9._-]+):$/),
    (line) => /^        [A-Za-z0-9._-]+:/.test(line),
    (m) => m[1],
    name,
    () => [`          ${name}:`, '            enabled: false', '            _rawValues: {}'],
  )

  writeLines(defaultsPath, next)
  console.log('Added apps entry in helmfile.d/snippets/defaults.yaml')
}

function ensureValuesFile(valuesFile: string, name: string): void {
  fs.mkdirSync(path.dirname(valuesFile), { recursive: true })
  if (fs.existsSync(valuesFile)) {
    console.log(`values file already exists: values/${name}/${name}.gotmpl`)
    return
  }
  fs.writeFileSync(valuesFile, '{}\n', 'utf8')
  console.log(`Created values/${name}/${name}.gotmpl`)
}

function ensureRawValuesFile(rawValuesFile: string, name: string): void {
  if (fs.existsSync(rawValuesFile)) {
    console.log(`raw values file already exists: values/${name}/${name}-raw.gotmpl`)
    return
  }

  const content = `{{- $v := .Values }}
{{- $httpRoute := tpl (readFile "../../helmfile.d/snippets/routes.gotmpl") $v | fromYaml }}
resources:
  - apiVersion: gateway.networking.k8s.io/v1
    kind: HTTPRoute
    metadata:
      name: ${name}
      {{ with $httpRoute.annotations }}
      annotations:
        {{ . | toYaml | nindent 8 }}
      {{- end }}
    spec:
      parentRefs:
        {{- $httpRoute.parentRefs | toYaml | nindent 8 }}
      hostnames:
        - {{ printf "${name}.%s" $v.cluster.domainSuffix }}
      rules:
        {{- $httpRoute.authRules | toYaml | nindent 8 }}
        - matches:
            - path:
                type: PathPrefix
                value: /
          backendRefs:
            - kind: Service
              name: ${name}
              port: 80
  - apiVersion: security.istio.io/v1
    kind: RequestAuthentication
    metadata:
      name: ${name}-auth
      namespace: ${name}
    spec:
      selector:
        matchLabels:
          app.kubernetes.io/name: ${name}
      jwtRules:
        - issuer: {{ $v._derived.oidcBaseUrl }}
          jwksUri: {{ $v._derived.oidcBaseUrlBackchannel }}/protocol/openid-connect/certs
          fromHeaders:
            - name: Authorization
              prefix: "Bearer "
  - apiVersion: security.istio.io/v1
    kind: AuthorizationPolicy
    metadata:
      name: ${name}-authz
      namespace: ${name}
    spec:
      action: ALLOW
      selector:
        matchLabels:
          app.kubernetes.io/name: ${name}
      rules:
        - from:
            - source:
                requestPrincipals: ["*"]
`

  fs.writeFileSync(rawValuesFile, content, 'utf8')
  console.log(`Created values/${name}/${name}-raw.gotmpl for public route + auth scaffolding`)
}

function ensureFixtureAppFile(fixturePath: string, name: string): void {
  if (fs.existsSync(fixturePath)) {
    console.log(`fixture app file already exists: tests/fixtures/env/apps/${name}.yaml`)
    return
  }

  const content = `kind: AplApp
metadata:
    name: ${name}
spec:
    _rawValues: {}
    enabled: false
`
  fs.writeFileSync(fixturePath, content, 'utf8')
  console.log(`Created tests fixture app file: tests/fixtures/env/apps/${name}.yaml`)
}

function ensureIntegrationEntries(integrationDir: string, name: string): void {
  for (const file of fs.readdirSync(integrationDir)) {
    if (!file.endsWith('.yaml')) continue
    const filePath = path.join(integrationDir, file)
    const lines = readLines(filePath)

    if (lines.some((line) => line === `  ${name}:`)) {
      console.log(`Integration file already contains apps.${name}: ${file}`)
      continue
    }

    const next = insertSortedBlock(
      lines,
      (line) => line === 'apps:',
      (line) => line.match(/^  ([A-Za-z0-9._-]+):$/),
      (line) => line === 'teamConfig:' || line === 'files:',
      (m) => m[1],
      name,
      () => [`  ${name}:`, '    enabled: false'],
    )

    writeLines(filePath, next)
    console.log(`Updated integration file: tests/integration/${file}`)
  }
}

function runCompareIfNeeded(root: string, runCompare: boolean, deps: RuntimeDeps = defaultDeps): void {
  if (!runCompare) return
  const env = { ...process.env }
  if (!env.ENV_DIR) env.ENV_DIR = path.join(root, 'tests/fixtures')
  console.log('Running bin/compare.sh to confirm rendering with new files...')
  deps.runCommand(path.join(root, 'bin/compare.sh'), { stdio: 'inherit', env })
}

export async function main(deps: RuntimeDeps = defaultDeps): Promise<void> {
  const opts = await parseArgs(process.argv.slice(2))

  const root = path.resolve(__dirname, '..', '..')
  const chartIndex = path.join(root, 'chart/chart-index/Chart.yaml')
  const defaultsFile = path.join(root, 'helmfile.d/snippets/defaults.yaml')
  const coreFile = path.join(root, 'core.yaml')
  const helmfileDir = path.join(root, 'helmfile.d')
  const valuesFile = path.join(root, 'values', opts.name, `${opts.name}.gotmpl`)
  const rawValuesFile = path.join(root, 'values', opts.name, `${opts.name}-raw.gotmpl`)
  const fixtureAppFile = path.join(root, 'tests/fixtures/env/apps', `${opts.name}.yaml`)
  const integrationDir = path.join(root, 'tests/integration')

  requireFile(chartIndex)
  requireFile(defaultsFile)
  requireFile(coreFile)

  if (hasReleaseNameInHelmfiles(helmfileDir, opts.name)) {
    throw new Error(`A release named ${opts.name} already exists in helmfile.d; refusing to create duplicate release`)
  }

  const resolvedVersion = resolveLatestOfficialSemver(opts.name, opts.repository, deps)
  deps.log(`Resolved latest stable chart version for ${opts.name}: ${resolvedVersion}`)

  ensureChartDependency(chartIndex, opts.name, resolvedVersion, opts.repository)
  vendorChart(root, opts.name, resolvedVersion, opts.repository, deps)
  createHelmfile(root, opts.name, opts.public, opts.configurePublicSecurity)
  ensureCoreNamespace(coreFile, opts.name, opts.public)
  if (opts.public) ensureAdminApp(coreFile, opts.name)
  ensureDefaultsEntry(defaultsFile, opts.name)
  ensureValuesFile(valuesFile, opts.name)
  if (opts.public && opts.configurePublicSecurity) ensureRawValuesFile(rawValuesFile, opts.name)
  ensureFixtureAppFile(fixtureAppFile, opts.name)
  ensureIntegrationEntries(integrationDir, opts.name)
  runCompareIfNeeded(root, opts.runCompare, deps)

  deps.log('Done. Next: npm run validate-values')
}

if (require.main === module) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    console.error(message)
    process.exit(1)
  })
}
