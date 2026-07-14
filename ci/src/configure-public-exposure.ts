import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'

type Opts = {
  name: string
  configurePublicSecurity: boolean
}

function usage(): never {
  console.error('Usage: npx tsx ci/src/configure-public-exposure.ts <name> [--configure-public-security true|false]')
  process.exit(2)
}

function parseBool(value: string, flag: string): boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  throw new Error(`Invalid value for ${flag}: ${value}. Expected true|false.`)
}

async function parseArgs(argv: string[]): Promise<Opts> {
  if (argv.length < 1) usage()

  const name = argv[0]
  let configurePublicSecurity: boolean | undefined

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--configure-public-security') {
      const value = argv[i + 1]
      if (!value) usage()
      configurePublicSecurity = parseBool(value, '--configure-public-security')
      i += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  if (configurePublicSecurity === undefined && process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const ans = await rl.question('Scaffold HTTPRoute + Istio authn/authz resources? (true/false) [true]: ')
    rl.close()
    configurePublicSecurity = ans.trim() === '' ? true : parseBool(ans.trim(), '--configure-public-security')
  }
  if (configurePublicSecurity === undefined) configurePublicSecurity = true

  return {
    name,
    configurePublicSecurity,
  }
}

function readLines(filePath: string): string[] {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
}

function writeLines(filePath: string, lines: string[]): void {
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8')
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

function findHelmfileForRelease(helmfileDir: string, releaseName: string): string {
  const files = fs.readdirSync(helmfileDir).filter((f) => f.endsWith('.yaml') || f.endsWith('.gotmpl'))
  const rx = new RegExp(`^\\s*-\\s+name:\\s+${releaseName}\\s*$`, 'm')
  const matches = files.filter((file) => rx.test(fs.readFileSync(path.join(helmfileDir, file), 'utf8')))

  if (matches.length === 0) {
    throw new Error(`Could not find a Helmfile release named ${releaseName} in helmfile.d`)
  }
  if (matches.length > 1) {
    throw new Error(`Found multiple Helmfile files with release ${releaseName}: ${matches.join(', ')}`)
  }

  return path.join(helmfileDir, matches[0])
}

function ensureArtifactsRelease(helmfilePath: string, name: string): void {
  const lines = readLines(helmfilePath)
  if (lines.some((line) => line.trim() === `- name: ${name}-artifacts`)) {
    console.log(`Helmfile already contains ${name}-artifacts release`)
    return
  }

  const releaseIdx = lines.findIndex((line) => line === `  - name: ${name}`)
  if (releaseIdx < 0) {
    throw new Error(`Could not locate release ${name} in ${path.basename(helmfilePath)}`)
  }

  const block = [
    `  - name: ${name}-artifacts`,
    `    installed: {{ $a | get "${name}.enabled" }}`,
    `    namespace: ${name}`,
    '    labels:',
    `      pkg: ${name}`,
    '      app: core',
    '    <<: *raw',
  ]

  lines.splice(releaseIdx, 0, ...block)
  writeLines(helmfilePath, lines)
  console.log(`Added ${name}-artifacts release in ${path.basename(helmfilePath)}`)
}

function ensureCoreNamespacePublic(corePath: string, name: string): void {
  const lines = readLines(corePath)
  const namespaceStart = lines.findIndex((line) => line === `    - name: ${name}`)

  if (namespaceStart < 0) {
    const next = insertSortedBlock(
      lines,
      (line) => line.trim() === 'namespaces:',
      (line) => line.match(/^    - name: (.+)$/),
      (line) => line === 'adminApps:',
      (m) => m[1],
      name,
      () => [`    - name: ${name}`, `      app: ${name}`],
    )
    writeLines(corePath, next)
    console.log(`Added public namespace ${name} to core.yaml`)
    return
  }

  const sectionEnd = (() => {
    for (let i = namespaceStart + 1; i < lines.length; i += 1) {
      if (lines[i].startsWith('    - name: ') || lines[i] === 'adminApps:') {
        return i
      }
    }
    return lines.length
  })()

  const block = lines.slice(namespaceStart, sectionEnd)
  const hadDisableIstio = block.includes('      disableIstioInjection: true')
  const hasApp = block.includes(`      app: ${name}`)

  const normalizedBlock = block.filter((line) => line !== '      disableIstioInjection: true')
  if (!hasApp) normalizedBlock.splice(1, 0, `      app: ${name}`)

  if (!hadDisableIstio && hasApp) {
    console.log(`Namespace ${name} already configured for public exposure`)
    return
  }

  lines.splice(namespaceStart, sectionEnd - namespaceStart, ...normalizedBlock)
  writeLines(corePath, lines)
  console.log(`Updated namespace ${name} for public exposure in core.yaml`)
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

function ensureRawValuesFile(rawValuesFile: string, name: string): void {
  fs.mkdirSync(path.dirname(rawValuesFile), { recursive: true })
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

export async function main(): Promise<void> {
  const opts = await parseArgs(process.argv.slice(2))

  const root = path.resolve(__dirname, '..', '..')
  const coreFile = path.join(root, 'core.yaml')
  const helmfileDir = path.join(root, 'helmfile.d')
  const rawValuesFile = path.join(root, 'values', opts.name, `${opts.name}-raw.gotmpl`)

  if (!fs.existsSync(coreFile)) throw new Error(`Missing required file: ${coreFile}`)
  if (!fs.existsSync(helmfileDir)) throw new Error(`Missing required directory: ${helmfileDir}`)

  ensureCoreNamespacePublic(coreFile, opts.name)
  ensureAdminApp(coreFile, opts.name)

  if (opts.configurePublicSecurity) {
    const helmfilePath = findHelmfileForRelease(helmfileDir, opts.name)
    ensureArtifactsRelease(helmfilePath, opts.name)
    ensureRawValuesFile(rawValuesFile, opts.name)
  }

  console.log('Done. Next: npm run validate-values')
}

if (require.main === module) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    console.error(message)
    process.exit(1)
  })
}
