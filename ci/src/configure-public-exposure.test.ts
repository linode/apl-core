import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { ensurePodAuthLabels, ensureRawValuesFile, findHelmfileForRelease, parseBool } from './configure-public-exposure'

describe('findHelmfileForRelease', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'find-helmfile-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('finds helmfile containing the named release', () => {
    fs.writeFileSync(path.join(tmpDir, 'helmfile-01.foo.yaml'), '  - name: foo\n')
    expect(findHelmfileForRelease(tmpDir, 'foo')).toBe(path.join(tmpDir, 'helmfile-01.foo.yaml'))
  })

  it('treats release name regex metacharacters as literals', () => {
    fs.writeFileSync(path.join(tmpDir, 'helmfile-01.my.app.yaml'), '  - name: my.app\n')
    fs.writeFileSync(path.join(tmpDir, 'helmfile-02.myXapp.yaml'), '  - name: myXapp\n')
    // 'my.app' as unescaped regex would also match 'myXapp' (dot matches any char)
    expect(findHelmfileForRelease(tmpDir, 'my.app')).toBe(path.join(tmpDir, 'helmfile-01.my.app.yaml'))
  })

  it('throws when no helmfile contains the named release', () => {
    fs.writeFileSync(path.join(tmpDir, 'helmfile-01.foo.yaml'), '  - name: foo\n')
    expect(() => findHelmfileForRelease(tmpDir, 'bar')).toThrow('Could not find a Helmfile release named bar')
  })
})

describe('configure-public-exposure helpers', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'configure-public-exposure-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('parseBool accepts true/false and rejects other values', () => {
    expect(parseBool('true', '--flag')).toBe(true)
    expect(parseBool('false', '--flag')).toBe(false)
    expect(() => parseBool('yes', '--flag')).toThrow('Invalid value for --flag: yes. Expected true|false.')
  })

  it('ensureRawValuesFile scaffolds auth-redirect route and AuthorizationPolicy', () => {
    const rawValuesFile = path.join(tmpDir, 'values', 'demo', 'demo-raw.gotmpl')

    ensureRawValuesFile(rawValuesFile, 'demo')

    const content = fs.readFileSync(rawValuesFile, 'utf8')
    expect(content).toContain('name: demo-auth-redirects')
    expect(content).toContain('kind: HTTPRoute')
    expect(content).toContain('$httpRoute.authRules')
  })

  it('ensurePodAuthLabels replaces empty object values with required labels', () => {
    const valuesFile = path.join(tmpDir, 'values', 'demo', 'demo.gotmpl')
    fs.mkdirSync(path.dirname(valuesFile), { recursive: true })
    fs.writeFileSync(valuesFile, '{}\n', 'utf8')

    ensurePodAuthLabels(valuesFile, 'demo')

    const content = fs.readFileSync(valuesFile, 'utf8')
    expect(content).toContain('podLabels:')
    expect(content).toContain('otomi.io/auth: platform')
    expect(content).toContain('otomi.io/auth-policy: platform')
  })

  it('ensurePodAuthLabels inserts missing keys in existing podLabels block', () => {
    const valuesFile = path.join(tmpDir, 'values', 'demo', 'demo.gotmpl')
    fs.mkdirSync(path.dirname(valuesFile), { recursive: true })
    fs.writeFileSync(
      valuesFile,
      [
        'replicaCount: 1',
        'podLabels:',
        '  app.kubernetes.io/name: demo',
        'service:',
        '  type: ClusterIP',
        '',
      ].join('\n'),
      'utf8',
    )

    ensurePodAuthLabels(valuesFile, 'demo')

    const content = fs.readFileSync(valuesFile, 'utf8')
    expect(content).toContain('  app.kubernetes.io/name: demo')
    expect(content).toContain('  otomi.io/auth: platform')
    expect(content).toContain('  otomi.io/auth-policy: platform')
    expect(content).toContain('service:\n  type: ClusterIP')
  })

  it('ensurePodAuthLabels appends podLabels block when absent', () => {
    const valuesFile = path.join(tmpDir, 'values', 'demo', 'demo.gotmpl')
    fs.mkdirSync(path.dirname(valuesFile), { recursive: true })
    fs.writeFileSync(valuesFile, 'replicaCount: 1\n', 'utf8')

    ensurePodAuthLabels(valuesFile, 'demo')

    const content = fs.readFileSync(valuesFile, 'utf8')
    expect(content).toContain('replicaCount: 1')
    expect(content).toContain('podLabels:')
    expect(content).toContain('otomi.io/auth: platform')
    expect(content).toContain('otomi.io/auth-policy: platform')
  })

  it('ensurePodAuthLabels corrects wrong auth label values inside existing podLabels block', () => {
    const valuesFile = path.join(tmpDir, 'values', 'demo', 'demo.gotmpl')
    fs.mkdirSync(path.dirname(valuesFile), { recursive: true })
    fs.writeFileSync(
      valuesFile,
      [
        'podLabels:',
        '  otomi.io/auth: platform-admin',
        '  otomi.io/auth-policy: platform-admin',
        '',
      ].join('\n'),
      'utf8',
    )

    ensurePodAuthLabels(valuesFile, 'demo')

    const content = fs.readFileSync(valuesFile, 'utf8')
    expect(content).toContain('  otomi.io/auth: platform')
    expect(content).toContain('  otomi.io/auth-policy: platform')
    expect(content).not.toContain('platform-admin')
  })

  it('ensurePodAuthLabels injects labels when auth keys appear only outside podLabels', () => {
    const valuesFile = path.join(tmpDir, 'values', 'demo', 'demo.gotmpl')
    fs.mkdirSync(path.dirname(valuesFile), { recursive: true })
    // auth keys appear in a comment, not in a podLabels block
    const initial = [
      '# otomi.io/auth: platform',
      '# otomi.io/auth-policy: platform',
      'replicaCount: 1',
      '',
    ].join('\n')
    fs.writeFileSync(valuesFile, initial, 'utf8')

    ensurePodAuthLabels(valuesFile, 'demo')

    const content = fs.readFileSync(valuesFile, 'utf8')
    expect(content).toContain('podLabels:')
    expect(content).toContain('  otomi.io/auth: platform')
    expect(content).toContain('  otomi.io/auth-policy: platform')
  })

  it('ensurePodAuthLabels keeps file unchanged when both labels already exist', () => {
    const valuesFile = path.join(tmpDir, 'values', 'demo', 'demo.gotmpl')
    fs.mkdirSync(path.dirname(valuesFile), { recursive: true })
    const initial = [
      'podLabels:',
      '  otomi.io/auth: platform',
      '  otomi.io/auth-policy: platform',
      '',
    ].join('\n')
    fs.writeFileSync(valuesFile, initial, 'utf8')

    ensurePodAuthLabels(valuesFile, 'demo')

    const content = fs.readFileSync(valuesFile, 'utf8')
    expect(content).toBe(initial)
  })
})
