import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { ensurePodAuthLabels, ensureRawValuesFile, parseBool } from './configure-public-exposure'

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
    expect(content).toContain('kind: AuthorizationPolicy')
    expect(content).toContain('name: demo-authz')
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
