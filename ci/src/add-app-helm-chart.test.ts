import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createHelmfile, parseStableSemver, resolveLatestOfficialSemver, type RuntimeDeps } from './add-app-helm-chart'

describe('createHelmfile', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'add-app-helm-chart-'))
    fs.mkdirSync(path.join(tmpDir, 'helmfile.d'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('generates a helmfile with four valid bases documents before releases', () => {
    const relPath = createHelmfile(tmpDir, 'myapp')
    const content = fs.readFileSync(path.join(tmpDir, relPath), 'utf8')
    const docs = content.split(/^---$/m).map((d) => d.trim())

    expect(docs[0]).toBe('bases:\n  - snippets/defaults.yaml')
    expect(docs[1]).toBe('bases:\n  - snippets/defaults.gotmpl')
    expect(docs[2]).toBe('bases:\n  - snippets/env.gotmpl')
    expect(docs[3]).toBe('bases:\n  - snippets/derived.gotmpl')
    expect(docs[4]).toContain('releases:')
  })

  it('names the file using the next helmfile sequence number', () => {
    fs.writeFileSync(path.join(tmpDir, 'helmfile.d', 'helmfile-92.other.yaml.gotmpl'), '')
    const relPath = createHelmfile(tmpDir, 'myapp')
    expect(path.basename(relPath)).toBe('helmfile-93.myapp.yaml.gotmpl')
  })
})

describe('add-app-helm-chart semver resolution', () => {
  const makeDeps = (runCommand: RuntimeDeps['runCommand']): RuntimeDeps => ({
    runCommand,
    pid: 4242,
    log: jest.fn(),
  })

  it('accepts stable semver and trims v-prefix', () => {
    const parsed = parseStableSemver('v1.2.3')
    expect(parsed?.version).toBe('1.2.3')
  })

  it('rejects prerelease semver', () => {
    const parsed = parseStableSemver('1.2.3-rc.1')
    expect(parsed).toBeNull()
  })

  it('resolves highest stable semver from helm repo search', () => {
    const runCommand = jest.fn<ReturnType<RuntimeDeps['runCommand']>, Parameters<RuntimeDeps['runCommand']>>()
    runCommand.mockReturnValueOnce('')
    runCommand.mockReturnValueOnce(
      JSON.stringify([
        { name: 'apl-temp-dex-4242/dex', version: '0.24.1' },
        { name: 'apl-temp-dex-4242/dex', version: '0.25.0-rc.1' },
        { name: 'apl-temp-dex-4242/dex', version: '0.23.0' },
      ]),
    )
    runCommand.mockReturnValueOnce('')

    const version = resolveLatestOfficialSemver('dex', 'https://charts.dexidp.io', makeDeps(runCommand))

    expect(version).toBe('0.24.1')
    expect(runCommand).toHaveBeenNthCalledWith(1, 'helm repo add apl-temp-dex-4242 https://charts.dexidp.io', { stdio: 'inherit' })
    expect(runCommand).toHaveBeenNthCalledWith(2, 'helm search repo apl-temp-dex-4242/dex --versions -o json', { encoding: 'utf8' })
    expect(runCommand).toHaveBeenNthCalledWith(3, 'helm repo remove apl-temp-dex-4242', { stdio: 'inherit' })
  })

  it('removes temporary repo alias even when search fails', () => {
    const runCommand = jest.fn<ReturnType<RuntimeDeps['runCommand']>, Parameters<RuntimeDeps['runCommand']>>()
    runCommand.mockReturnValueOnce('')
    runCommand.mockImplementationOnce(() => {
      throw new Error('search failed')
    })
    runCommand.mockReturnValueOnce('')

    expect(() => resolveLatestOfficialSemver('dex', 'https://charts.dexidp.io', makeDeps(runCommand))).toThrow('search failed')
    expect(runCommand).toHaveBeenNthCalledWith(3, 'helm repo remove apl-temp-dex-4242', { stdio: 'inherit' })
  })

  it('resolves stable semver from OCI chart metadata', () => {
    const runCommand = jest.fn<ReturnType<RuntimeDeps['runCommand']>, Parameters<RuntimeDeps['runCommand']>>()
    runCommand.mockReturnValue('name: dex\nversion: 0.24.2\n')

    const version = resolveLatestOfficialSemver('dex', 'oci://ghcr.io/dexidp/charts', makeDeps(runCommand))

    expect(version).toBe('0.24.2')
    expect(runCommand).toHaveBeenCalledWith('helm show chart oci://ghcr.io/dexidp/charts/dex', { encoding: 'utf8' })
  })
})
